import 'dart:async';
import 'dart:convert';
import 'dart:math';
import 'dart:typed_data';

import 'package:bluetooth_low_energy/bluetooth_low_energy.dart';
import 'package:collection/collection.dart';
import 'package:flutter/foundation.dart';
import 'package:get/get.dart';
import 'package:town_pass/bean/account.dart';
import 'package:town_pass/service/account_service.dart';

/// 幫家人辦：用藍牙（BLE）把台北通帳號的基本資料直接傳給旁邊家人的手機，不經過伺服器。
///
/// - 傳送方（被幫的人）當 BLE peripheral：廣播專屬服務 ID，提供一個可讀的資料欄位和一個可寫的回條欄位。
/// - 接收方（幫忙的人）當 BLE central：搜尋服務 ID、連上訊號最強的手機、讀資料，再寫回條讓傳送方知道已送達。
///
/// 傳送內容依白名單組成，不含身分證字號、電話、email、詳細地址；
/// 欄位要和 microservice/src/services/townpass.ts 的 `SharedBasicInfo` 一致。
class BleShareService {
  BleShareService._();

  static final BleShareService instance = BleShareService._();

  static final UUID serviceUuid = UUID.fromString('6f1c0001-3b5e-4c2a-9d7e-5a1b2c3d4e5f');
  static final UUID dataUuid = UUID.fromString('6f1c0002-3b5e-4c2a-9d7e-5a1b2c3d4e5f');
  static final UUID ackUuid = UUID.fromString('6f1c0003-3b5e-4c2a-9d7e-5a1b2c3d4e5f');

  /// 傳送方最多等多久沒人接收就自動停止
  static const Duration shareDuration = Duration(seconds: 60);

  /// 接收方最多搜尋多久；前端的等待時間要比這個長（townpass.ts 用 35 秒）
  static const Duration scanDuration = Duration(seconds: 20);

  /// 找到第一支手機後再多聽一下，從中挑訊號最強（最近）的
  static const Duration pickNearestWindow = Duration(milliseconds: 1500);

  static const Duration _stepTimeout = Duration(seconds: 10);

  // 第一次建立時 iOS 會詢問藍牙權限，所以用到才建立
  PeripheralManager? _peripheralManager;
  CentralManager? _centralManager;

  PeripheralManager get _peripheral => _peripheralManager ??= PeripheralManager();

  CentralManager get _central => _centralManager ??= CentralManager();

  StreamSubscription<GATTCharacteristicReadRequestedEventArgs>? _readSubscription;
  StreamSubscription<GATTCharacteristicWriteRequestedEventArgs>? _writeSubscription;
  Timer? _shareTimer;
  void Function(Map<String, Object?> event)? _emitShareEvent;
  bool _receiving = false;

  // ---------------- 傳送方 ----------------

  /// 開始傳送。透過 [emit] 依序回報：advertising（附核對代碼）→ sent／timeout，失敗時回報 unavailable／error。
  Future<void> startShare(void Function(Map<String, Object?> event) emit) async {
    await stopShare();

    final Account? account = Get.find<AccountService>().account;
    if (account == null) {
      emit({'state': 'unavailable', 'reason': 'noAccount'});
      return;
    }

    final String? reason = await _unavailableReason(_peripheral);
    if (reason != null) {
      emit({'state': 'unavailable', 'reason': reason});
      return;
    }

    final String code = (Random.secure().nextInt(9000) + 1000).toString();
    final Uint8List value = Uint8List.fromList(utf8.encode(jsonEncode(sharedPayload(account, code))));

    _emitShareEvent = emit;
    _readSubscription = _peripheral.characteristicReadRequested.listen((event) async {
      if (event.characteristic.uuid != dataUuid) return;
      // 資料比單次封包長時，接收方會分段讀，iOS 要求從 offset 開始回傳
      final int offset = event.request.offset;
      try {
        if (offset > value.length) {
          await _peripheral.respondReadRequestWithError(event.request, error: GATTError.invalidOffset);
        } else {
          await _peripheral.respondReadRequestWithValue(event.request, value: value.sublist(offset));
        }
      } catch (error) {
        debugPrint('BleShareService read response failed: $error');
      }
    });
    _writeSubscription = _peripheral.characteristicWriteRequested.listen((event) async {
      if (event.characteristic.uuid != ackUuid) return;
      try {
        await _peripheral.respondWriteRequest(event.request);
      } catch (error) {
        debugPrint('BleShareService write response failed: $error');
      }
      await _finishShare({'state': 'sent'});
    });

    try {
      await _peripheral.removeAllServices();
      await _peripheral.addService(
        GATTService(
          uuid: serviceUuid,
          isPrimary: true,
          includedServices: [],
          characteristics: [
            GATTCharacteristic.mutable(
              uuid: dataUuid,
              properties: [GATTCharacteristicProperty.read],
              permissions: [GATTCharacteristicPermission.read],
              descriptors: [],
            ),
            GATTCharacteristic.mutable(
              uuid: ackUuid,
              properties: [GATTCharacteristicProperty.write],
              permissions: [GATTCharacteristicPermission.write],
              descriptors: [],
            ),
          ],
        ),
      );
      // 不帶 name：Android 會因此改掉整支手機的藍牙名稱；核對代碼放在資料裡
      await _peripheral.startAdvertising(Advertisement(serviceUUIDs: [serviceUuid]));
    } catch (error) {
      debugPrint('BleShareService startShare failed: $error');
      await _finishShare({'state': 'error', 'message': error.toString()});
      return;
    }

    _shareTimer = Timer(shareDuration, () => _finishShare({'state': 'timeout'}));
    emit({'state': 'advertising', 'code': code});
  }

  /// 停止廣播並清掉資料；可以重複呼叫
  Future<void> stopShare() async {
    _shareTimer?.cancel();
    _shareTimer = null;
    _emitShareEvent = null;
    await _readSubscription?.cancel();
    await _writeSubscription?.cancel();
    _readSubscription = null;
    _writeSubscription = null;
    final PeripheralManager? peripheral = _peripheralManager;
    if (peripheral == null) return;
    try {
      await peripheral.stopAdvertising();
      await peripheral.removeAllServices();
    } catch (error) {
      debugPrint('BleShareService stopShare failed: $error');
    }
  }

  Future<void> _finishShare(Map<String, Object?> event) async {
    final emit = _emitShareEvent;
    await stopShare();
    emit?.call(event);
  }

  /// 白名單：只放「幫家人辦」基本資料頁需要的欄位
  @visibleForTesting
  static Map<String, Object?> sharedPayload(Account account, String code) {
    final Address? address = account.addressList.firstWhereOrNull((item) => item.priority) ??
        account.addressList.firstWhereOrNull((_) => true);
    return {
      'v': 1,
      'code': code,
      'name': account.realName,
      'age': ageFromBirthday(account.birthday),
      'city': address?.city,
      'town': address?.town,
      'citizen': account.citizen,
      'native': account.nativePeople,
    };
  }

  /// 由「1988/12/12」或「1988-12-12」格式的生日算出足歲，與 microservice/src/utils/age.ts 相同
  @visibleForTesting
  static int? ageFromBirthday(String birthday, {DateTime? today}) {
    final match = RegExp(r'^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$').firstMatch(birthday.trim());
    if (match == null) return null;
    final int year = int.parse(match.group(1)!);
    final int month = int.parse(match.group(2)!);
    final int day = int.parse(match.group(3)!);
    final DateTime now = today ?? DateTime.now();
    int age = now.year - year;
    if (now.month < month || (now.month == month && now.day < day)) age -= 1;
    return age >= 0 && age <= 130 ? age : null;
  }

  // ---------------- 接收方 ----------------

  /// 搜尋附近正在傳送的手機並讀取資料。
  /// 回傳 found（附核對代碼與資料）、notFound、unavailable 或 error。
  Future<Map<String, Object?>> receive() async {
    if (_receiving) return {'state': 'error', 'message': 'busy'};
    _receiving = true;
    try {
      final String? reason = await _unavailableReason(_central);
      if (reason != null) return {'state': 'unavailable', 'reason': reason};

      final List<Peripheral> candidates = await _discoverNearest();
      if (candidates.isEmpty) return {'state': 'notFound'};

      // 最近的那支讀不到時，再試第二近的
      for (final Peripheral peripheral in candidates.take(2)) {
        final Map<String, Object?>? result = await _readFrom(peripheral);
        if (result != null) return result;
      }
      return {'state': 'error', 'message': 'read failed'};
    } catch (error) {
      debugPrint('BleShareService receive failed: $error');
      return {'state': 'error', 'message': error.toString()};
    } finally {
      _receiving = false;
    }
  }

  /// 回傳搜尋到的手機，訊號由強到弱排序
  Future<List<Peripheral>> _discoverNearest() async {
    final Map<UUID, DiscoveredEventArgs> found = {};
    final Completer<void> firstFound = Completer<void>();
    final subscription = _central.discovered.listen((event) {
      // 系統已依服務 ID 過濾；廣播資料有帶服務 ID 時再確認一次
      final List<UUID> uuids = event.advertisement.serviceUUIDs;
      if (uuids.isNotEmpty && !uuids.contains(serviceUuid)) return;
      final DiscoveredEventArgs? previous = found[event.peripheral.uuid];
      if (previous == null || event.rssi > previous.rssi) found[event.peripheral.uuid] = event;
      if (!firstFound.isCompleted) firstFound.complete();
    });
    try {
      await _central.startDiscovery(serviceUUIDs: [serviceUuid]);
      try {
        await firstFound.future.timeout(scanDuration);
      } on TimeoutException {
        return [];
      }
      await Future<void>.delayed(pickNearestWindow);
    } finally {
      await subscription.cancel();
      try {
        await _central.stopDiscovery();
      } catch (error) {
        debugPrint('BleShareService stopDiscovery failed: $error');
      }
    }
    final List<DiscoveredEventArgs> sorted = found.values.toList()..sort((a, b) => b.rssi.compareTo(a.rssi));
    return sorted.map((event) => event.peripheral).toList();
  }

  Future<Map<String, Object?>?> _readFrom(Peripheral peripheral) async {
    try {
      await _central.connect(peripheral).timeout(_stepTimeout);
      final List<GATTService> services = await _central.discoverGATT(peripheral).timeout(_stepTimeout);
      final GATTService? service = services.firstWhereOrNull((item) => item.uuid == serviceUuid);
      final GATTCharacteristic? dataCharacteristic =
          service?.characteristics.firstWhereOrNull((item) => item.uuid == dataUuid);
      if (service == null || dataCharacteristic == null) return null;

      final Uint8List bytes = await _central.readCharacteristic(peripheral, dataCharacteristic).timeout(_stepTimeout);
      final Object? decoded = jsonDecode(utf8.decode(bytes));
      if (decoded is! Map<String, dynamic> || decoded['v'] != 1) return null;

      // 寫回條讓傳送方知道已送達；失敗不影響接收結果
      final GATTCharacteristic? ackCharacteristic =
          service.characteristics.firstWhereOrNull((item) => item.uuid == ackUuid);
      if (ackCharacteristic != null) {
        try {
          await _central
              .writeCharacteristic(
                peripheral,
                ackCharacteristic,
                value: Uint8List.fromList(utf8.encode('ok')),
                type: GATTCharacteristicWriteType.withResponse,
              )
              .timeout(_stepTimeout);
        } catch (error) {
          debugPrint('BleShareService ack failed: $error');
        }
      }

      final Object? code = decoded.remove('code');
      return {'state': 'found', 'code': code?.toString() ?? '', 'data': decoded};
    } catch (error) {
      debugPrint('BleShareService read failed: $error');
      return null;
    } finally {
      try {
        await _central.disconnect(peripheral);
      } catch (_) {
        // 本來就沒連上時會丟例外，忽略
      }
    }
  }

  // ---------------- 共用 ----------------

  /// 藍牙可以用時回傳 null，否則回傳原因：off、unauthorized、unsupported
  Future<String?> _unavailableReason(BluetoothLowEnergyManager manager) async {
    BluetoothLowEnergyState state = manager.state;
    // iOS 剛建立 manager 時狀態是 unknown，要等系統回報
    if (state == BluetoothLowEnergyState.unknown) {
      state = await manager.stateChanged
          .map((event) => event.state)
          .firstWhere((value) => value != BluetoothLowEnergyState.unknown)
          .timeout(const Duration(seconds: 3), onTimeout: () => manager.state);
    }
    // Android 要在執行時要求藍牙權限
    if (state == BluetoothLowEnergyState.unauthorized && GetPlatform.isAndroid) {
      try {
        if (await manager.authorize()) state = manager.state;
      } catch (error) {
        debugPrint('BleShareService authorize failed: $error');
      }
    }
    return switch (state) {
      BluetoothLowEnergyState.poweredOn => null,
      BluetoothLowEnergyState.poweredOff => 'off',
      BluetoothLowEnergyState.unauthorized => 'unauthorized',
      _ => 'unsupported',
    };
  }
}
