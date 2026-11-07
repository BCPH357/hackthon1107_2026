import 'dart:io';

import 'package:archive/archive.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:town_pass/page/city_service/model/my_service_model.dart';

/// 只在這支手機上提供隨 App 打包的城市網頁。
class CityGuideSite {
  CityGuideSite._();

  static final instance = CityGuideSite._();
  Future<Uri?>? _startup;
  Uri? _origin;

  Future<Uri?> start() => _startup ??= _start();

  /// 可以使用城市嚮導（裝置端 AI、語音）的網頁：隨 App 打包的離線版，或「一路相伴」的正式網址
  /// （預設是 Cloudflare Pages，建置時用 LIFE_EVENTS_URL 換網址的話跟著換）。其他網站一律不回應。
  bool trustsOrigin(Uri? source) {
    if (ownsOrigin(source)) return true;
    final service = Uri.tryParse(lifeEventsServiceUrl);
    return service != null &&
        source != null &&
        source.scheme == service.scheme &&
        source.host == service.host &&
        source.port == service.port;
  }

  bool ownsOrigin(Uri? source) {
    final origin = _origin;
    return origin != null &&
        source != null &&
        source.scheme == origin.scheme &&
        source.host == origin.host &&
        source.port == origin.port;
  }

  Future<Uri?> _start() async {
    try {
      final data = await rootBundle.load('assets/life_events/site.zip');
      final archive = ZipDecoder().decodeBytes(
        data.buffer.asUint8List(data.offsetInBytes, data.lengthInBytes),
      );
      final files = {
        for (final entry in archive.files)
          if (entry.isFile) entry.name: entry,
      };
      if (!files.containsKey('index.html')) return null;

      // 固定 origin，讓 WebView 的本機進度可在 App 重開後接續。
      final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 43862);
      final origin = Uri(
        scheme: 'http',
        host: '127.0.0.1',
        port: server.port,
        path: '/',
      );
      _origin = origin;
      server.listen((request) async {
        final path = request.uri.pathSegments
            .where((part) => part.isNotEmpty)
            .join('/');
        final name = path.isEmpty ? 'index.html' : path;
        final file = files[name];
        final response = request.response;
        if (request.method != 'GET' && request.method != 'HEAD') {
          response.statusCode = HttpStatus.methodNotAllowed;
        } else if (file == null) {
          response.statusCode = HttpStatus.notFound;
        } else {
          response.headers.set(
            HttpHeaders.contentTypeHeader,
            _contentType(name),
          );
          response.contentLength = file.size;
          if (request.method == 'GET') response.add(file.content);
        }
        await response.close();
      });
      return origin;
    } on FlutterError {
      // 開發時可直接使用原本的網站，離線版由 build:app 產生。
      return null;
    } on SocketException {
      return null;
    }
  }

  static String _contentType(String name) => switch (name.split('.').last) {
    'html' => 'text/html; charset=utf-8',
    'js' => 'text/javascript; charset=utf-8',
    'css' => 'text/css; charset=utf-8',
    'json' || 'gltf' => 'application/json',
    'svg' => 'image/svg+xml',
    'png' => 'image/png',
    'jpg' || 'jpeg' => 'image/jpeg',
    'webp' => 'image/webp',
    'glb' => 'model/gltf-binary',
    'woff2' => 'font/woff2',
    _ => 'application/octet-stream',
  };
}
