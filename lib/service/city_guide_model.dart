import 'dart:io';

import 'package:flutter_edge_ai/flutter_edge_ai.dart';
import 'package:flutter_edge_ai_litertlm/flutter_edge_ai_litertlm.dart';
import 'package:path_provider/path_provider.dart';

typedef CityGuideModelFile = ({String name, int size});

class CityGuideModel {
  CityGuideModel._();

  static final instance = CityGuideModel._();
  static const _models = <CityGuideModelFile>[
    (name: 'gemma-4-E4B-it', size: 3659530240),
    (name: 'gemma-4-E2B-it', size: 2588147712),
  ];
  static const _preferE2b = bool.fromEnvironment('CITY_GUIDE_PREFER_E2B');
  final _unavailable = <String>{};
  bool _initialized = false;
  InferenceModel? _model;
  String? _modelName;

  String? get modelName => _modelName;

  Future<List<({String name, String path})>> _installed() async {
    final support = await getApplicationSupportDirectory();
    final directory = Directory('${support.path}/gemma-models');
    final results = <({String name, String path})>[];
    for (final candidate in _preferE2b ? _models.reversed : _models) {
      if (_unavailable.contains(candidate.name)) continue;
      final file = File('${directory.path}/${candidate.name}.litertlm');
      if (await file.exists() && await file.length() == candidate.size) {
        results.add((name: candidate.name, path: file.path));
      }
    }
    return results;
  }

  Future<String?> availableModel() async =>
      modelName ?? (await _installed()).firstOrNull?.name;

  /// 模型選候選項，辦理資訊由網頁的服務資料組成。
  Future<int?> choose(
    String question,
    List<String> choices,
    bool Function() cancelled,
  ) async {
    final installed = await _installed();
    if (installed.isEmpty) return null;
    if (!_initialized) {
      await FlutterEdgeAi.initialize(
        inferenceEngines: const [LiteRtLmEngine()],
      );
      _initialized = true;
    }
    for (final file in installed) {
      if (cancelled()) return null;
      try {
        if (_modelName != file.name) {
          await _close();
          _model = await _open(file.path);
          _modelName = file.name;
        }
        if (cancelled()) return null;
        return await _select(_model!, question, choices, cancelled);
      } catch (_) {
        // 有些記憶體錯誤會在第一次推論時才發生。
        _unavailable.add(file.name);
        await _close();
      }
    }
    return null;
  }

  Future<void> _close() async {
    final model = _model;
    _model = null;
    _modelName = null;
    try {
      await model?.close();
    } catch (_) {
      // 清理失敗仍讓導覽走備援路徑。
    }
  }

  Future<InferenceModel> _open(String path) async {
    final installation = await FlutterEdgeAi.installModel(
      modelType: ModelType.gemma4,
      fileType: ModelFileType.litertlm,
    ).fromFile(path).install(activate: false);
    return FlutterEdgeAi.openModel(
      installation.spec,
      maxTokens: 1024,
      preferredBackend: PreferredBackend.cpu,
      supportImage: false,
      supportAudio: false,
    );
  }

  Future<int?> _select(
    InferenceModel model,
    String question,
    List<String> choices,
    bool Function() cancelled,
  ) async {
    final list = choices.indexed
        .map((entry) => '${entry.$1 + 1}. ${entry.$2}')
        .join('\n');
    final prompt =
        '''
你是臺北市服務導航。只輸出最符合使用者問題的候選編號，不要解釋。
出院後需要申請哪些服務，優先選完整導覽。
只有需要判斷病情、審核資格或沒有對應服務時，輸出 0。
候選：
$list
使用者問題：$question
''';
    final chat = await model.createChat(
      modelType: ModelType.gemma4,
      maxOutputTokens: 16,
      topK: 1,
    );
    try {
      await chat.addQueryChunk(Message.text(text: prompt, isUser: true));
      final output = StringBuffer();
      await for (final response in chat.generateChatResponseAsync()) {
        if (cancelled()) return null;
        if (response is TextResponse) output.write(response.token);
      }
      final match = RegExp(r'^\s*(\d+)[.。]?\s*$').firstMatch(output.toString());
      final selection = int.tryParse(match?.group(1) ?? '');
      return selection != null && selection >= 0 && selection <= choices.length
          ? selection
          : null;
    } finally {
      await chat.close();
    }
  }
}
