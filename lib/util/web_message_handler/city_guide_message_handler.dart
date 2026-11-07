import 'dart:io';

import 'package:flutter/services.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:town_pass/service/city_guide_model.dart';
import 'package:town_pass/service/city_guide_site.dart';
import 'package:town_pass/util/web_message_handler/tp_web_message_handler.dart';

class CityGuideMessageHandler extends TPWebMessageHandler {
  CityGuideMessageHandler(this.name);

  @override
  final String name;
  static const _voice = MethodChannel('town_pass/city_guide');
  static String? _active;
  static bool _cancelled = false;

  @override
  Future<void> handle({
    required Object? message,
    required WebUri? sourceOrigin,
    required bool isMainFrame,
    required Function(WebMessage replyWebMessage)? onReply,
  }) async {
    if (!isMainFrame || !CityGuideSite.instance.trustsOrigin(sourceOrigin)) {
      return;
    }
    final request = message is Map ? message : const {};
    final id = request['id'];
    if (id is! String || id.length > 80) return;
    void reply(Map<String, Object?> data) =>
        onReply?.call(replyWebMessage(data: {'id': id, ...data}));

    if (name == 'llm_status') {
      try {
        reply({
          'model': await CityGuideModel.instance.availableModel(),
          'voice': Platform.isIOS,
        });
      } catch (_) {
        reply({'model': null, 'voice': Platform.isIOS});
      }
      return;
    }
    if (name == 'llm_cancel') {
      if (_active == id) _cancelled = true;
      return;
    }
    if (name == 'city_voice_cancel') {
      if (Platform.isIOS) await _voice.invokeMethod<void>('cancelSpeech');
      return;
    }
    if (name == 'city_voice') {
      try {
        final text = Platform.isIOS
            ? await _voice.invokeMethod<String>('recognizeSpeech')
            : null;
        reply({'text': text});
      } on PlatformException catch (error) {
        reply({'error': error.code});
      }
      return;
    }

    final question = request['question'];
    final choices = request['choices'];
    if (question is! String ||
        question.isEmpty ||
        question.length > 240 ||
        choices is! List ||
        choices.isEmpty ||
        choices.length > 5 ||
        choices.any((item) => item is! String || item.length > 100)) {
      reply({'type': 'error', 'code': 'invalid'});
      return;
    }
    if (_active != null) {
      reply({'type': 'error', 'code': 'busy'});
      return;
    }
    _active = id;
    _cancelled = false;
    try {
      reply({'type': 'working'});
      final choice = await CityGuideModel.instance.choose(
        question,
        choices.cast<String>(),
        () => _cancelled,
      );
      if (!_cancelled) {
        reply({
          'type': 'done',
          'choice': choice,
          'model': CityGuideModel.instance.modelName,
        });
      }
    } catch (_) {
      if (!_cancelled) reply({'type': 'error', 'code': 'failed'});
    } finally {
      _active = null;
      _cancelled = false;
    }
  }
}
