import 'package:flutter/material.dart';
import 'package:town_pass/gen/assets.gen.dart';
import 'package:town_pass/page/city_service/model/my_service_model.dart';
import 'package:town_pass/util/tp_colors.dart';
import 'package:town_pass/util/tp_route.dart';
import 'package:town_pass/util/tp_text.dart';

/// 首頁的「一路相伴」入口：一打開城市通就看得到，不必先到「服務」頁找。
/// 圖示用白色圓底，和「服務」頁的我的服務一致。
class LifeEventsEntryWidget extends StatelessWidget {
  const LifeEventsEntryWidget({super.key});

  @override
  Widget build(BuildContext context) {
    final MyServiceItem item = MyServiceItemId.lifeEvents.item;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      // 整張卡片是一個按鈕，讀屏念「一路相伴，說明，按鈕」，不重複念裡面的文字
      child: Semantics(
        button: true,
        label: '${item.title}，${item.description}',
        excludeSemantics: true,
        child: Material(
          color: TPColors.primary50,
          borderRadius: BorderRadius.circular(8),
          child: InkWell(
            borderRadius: BorderRadius.circular(8),
            onTap: () async => await TPRoute.openUri(
              uri: item.destinationUrl,
              forceTitle: item.forceWebViewTitle,
            ),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 28,
                    backgroundColor: TPColors.white,
                    child: item.icon,
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        TPText(
                          item.title,
                          style: TPTextStyles.titleSemiBold,
                          color: TPColors.grayscale900,
                        ),
                        const SizedBox(height: 4),
                        TPText(
                          item.description,
                          style: TPTextStyles.bodyRegular,
                          color: TPColors.grayscale700,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  Assets.svg.iconArrowRight.svg(width: 24, height: 24),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
