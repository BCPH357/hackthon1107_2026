import UIKit
import Flutter
import AVFoundation
import Speech
import flutter_local_notifications

@main
@objc class AppDelegate: FlutterAppDelegate, FlutterImplicitEngineDelegate {
  private let cityGuideSpeech = CityGuideSpeech()

  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    UNUserNotificationCenter.current().delegate = self as UNUserNotificationCenterDelegate
    let files = FileManager.default
    if let support = try? files.url(
      for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
    {
      var models = support.appendingPathComponent("gemma-models", isDirectory: true)
      try? files.createDirectory(at: models, withIntermediateDirectories: true)
      var values = URLResourceValues()
      values.isExcludedFromBackup = true
      try? models.setResourceValues(values)
    }

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  // UIScene lifecycle 下，plugin 註冊必須放在這裡，不能放在 didFinishLaunchingWithOptions
  func didInitializeImplicitFlutterEngine(_ engineBridge: FlutterImplicitEngineBridge) {
    // This is required to make any communication available in the action isolate.
    FlutterLocalNotificationsPlugin.setPluginRegistrantCallback { (registry) in
      GeneratedPluginRegistrant.register(with: registry)
    }

    GeneratedPluginRegistrant.register(with: engineBridge.pluginRegistry)
    let channel = FlutterMethodChannel(
      name: "town_pass/city_guide", binaryMessenger: engineBridge.applicationRegistrar.messenger())
    channel.setMethodCallHandler { [cityGuideSpeech] call, result in
      switch call.method {
      case "recognizeSpeech": cityGuideSpeech.start(result)
      case "cancelSpeech":
        cityGuideSpeech.cancel()
        result(nil)
      default: result(FlutterMethodNotImplemented)
      }
    }
  }
}

private final class CityGuideSpeech {
  private let engine = AVAudioEngine()
  private let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "zh-TW"))
  private var request: SFSpeechAudioBufferRecognitionRequest?
  private var task: SFSpeechRecognitionTask?
  private var active: UUID?
  private var completion: FlutterResult?
  private var hasTap = false
  private var lastText = ""
  private var previousAudio: (AVAudioSession.Category, AVAudioSession.Mode, AVAudioSession.CategoryOptions)?

  func start(_ result: @escaping FlutterResult) {
    guard active == nil else {
      result(FlutterError(code: "busy", message: nil, details: nil))
      return
    }
    guard let recognizer, recognizer.supportsOnDeviceRecognition, recognizer.isAvailable else {
      result(FlutterError(code: "offline_unavailable", message: nil, details: nil))
      return
    }
    let id = UUID()
    active = id
    completion = result
    lastText = ""
    SFSpeechRecognizer.requestAuthorization { status in
      DispatchQueue.main.async {
        guard self.active == id else { return }
        guard status == .authorized else {
          self.finish(error: "permission")
          return
        }
        AVAudioSession.sharedInstance().requestRecordPermission { allowed in
          DispatchQueue.main.async {
            guard self.active == id else { return }
            if allowed {
              self.record(recognizer, id: id)
            } else {
              self.finish(error: "permission")
            }
          }
        }
      }
    }
  }

  private func record(_ recognizer: SFSpeechRecognizer, id: UUID) {
    let audio = AVAudioSession.sharedInstance()
    previousAudio = (audio.category, audio.mode, audio.categoryOptions)
    do {
      try audio.setCategory(.record, mode: .measurement)
      try audio.setActive(true)
      let speechRequest = SFSpeechAudioBufferRecognitionRequest()
      speechRequest.requiresOnDeviceRecognition = true
      speechRequest.shouldReportPartialResults = true
      request = speechRequest

      let input = engine.inputNode
      let format = input.outputFormat(forBus: 0)
      guard format.sampleRate > 0, format.channelCount > 0 else {
        finish(error: "audio")
        return
      }
      input.installTap(onBus: 0, bufferSize: 1024, format: format) { buffer, _ in
        speechRequest.append(buffer)
      }
      hasTap = true
      engine.prepare()
      try engine.start()
      task = recognizer.recognitionTask(with: speechRequest) { response, error in
        DispatchQueue.main.async {
          guard self.active == id else { return }
          if let response { self.lastText = response.bestTranscription.formattedString }
          if response?.isFinal == true || error != nil {
            self.finish(error: self.lastText.isEmpty ? "no_speech" : nil)
          }
        }
      }
      DispatchQueue.main.asyncAfter(deadline: .now() + 7) {
        guard self.active == id else { return }
        self.stopRecording()
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
          guard self.active == id else { return }
          self.finish(error: self.lastText.isEmpty ? "no_speech" : nil)
        }
      }
    } catch {
      finish(error: "audio")
    }
  }

  func cancel() {
    if active != nil { finish(error: "cancelled") }
  }

  private func stopRecording() {
    engine.stop()
    if hasTap {
      engine.inputNode.removeTap(onBus: 0)
      hasTap = false
    }
    request?.endAudio()
    request = nil
  }

  private func finish(error: String?) {
    active = nil
    stopRecording()
    task?.cancel()
    task = nil
    if let previousAudio {
      let audio = AVAudioSession.sharedInstance()
      try? audio.setActive(false, options: .notifyOthersOnDeactivation)
      try? audio.setCategory(previousAudio.0, mode: previousAudio.1, options: previousAudio.2)
    }
    previousAudio = nil
    let result = completion
    completion = nil
    if let error {
      result?(FlutterError(code: error, message: nil, details: nil))
    } else {
      result?(lastText)
    }
  }
}
