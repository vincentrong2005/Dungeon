export const Schema = z.object({
  主角信息: z
    .object({
      种族: z.string().prefault(''),
      姓名: z.string().prefault(''),
      年龄: z.coerce.number().int().prefault(0),
      贞操: z.string().prefault(''),
      天赋: z.string().prefault(''),
      外貌: z.string().prefault(''),
      特征: z.string().prefault(''),
      身高: z.coerce.number().int().prefault(0),
      体重: z.string().prefault(''),
      胸围: z.string().prefault(''),
      臀部: z.string().prefault(''),
      小穴: z.string().prefault(''),
      屁穴: z.string().prefault(''),
      敏感点: z.string().prefault(''),
      背景故事: z.string().prefault(''),
    })
    .prefault({}),

  // 人物属性
  _血量: z.coerce.number().prefault(20),
  _血量上限: z.coerce.number().prefault(20),
  $魔量: z.coerce.number().prefault(1),
  _金币: z.coerce.number().prefault(0),
  $初始血量上限: z.coerce.number().prefault(20),
  $初始魔量: z.coerce.number().prefault(1),
  $初始金币: z.coerce.number().prefault(0),
  $技能点: z.coerce.number().prefault(0),
  $局外成长: z.array(z.string()).prefault([]),
  _技能: z.array(z.string()).length(9).prefault(['', '', '', '', '', '', '', '', '']),
  // 与 _技能 槽位一一对应的附魔（精炼Ⅰ~Ⅲ / 淫文 / 刑印·X），'' 表示无附魔
  _附魔: z.array(z.string()).length(9).prefault(['', '', '', '', '', '', '', '', '']),
  $负面状态: z.array(z.string()).prefault([]),
  $被动: z.string().prefault(''),
  $主动: z.array(z.string()).length(2).prefault(['', '']),
  _携带的魔法书: z.array(z.string()).prefault([]),
  携带的物品: z
    .object({
      物品: z
        .array(
          z
            .object({
              名字: z.string().prefault(''),
              描述: z.string().prefault(''),
            })
            .prefault({}),
        )
        .prefault([]),
      _圣遗物: z.record(z.string().describe('圣遗物名'), z.coerce.number().describe('数量')).prefault({}),
      消耗品: z
        .array(
          z
            .object({
              名字: z.string().prefault(''),
              描述: z.string().prefault(''),
              回复: z.coerce.number().prefault(0),
            })
            .prefault({}),
        )
        .prefault([]),
    })
    .prefault({}),

  // 计算属性（由其他脚本操控）
  $最大点数: z.coerce.number().prefault(0),
  $最小点数: z.coerce.number().prefault(0),
  $星期: z.coerce.number().transform(v => _.clamp(v, 1, 7)).prefault(1),
  $难度: z.enum(['简单', '普通', '困难', '地狱', '自定义']).prefault('普通'),
  $自定义影响: z.array(z.string()).prefault([]),

  // 游戏状态
  _楼层数: z.coerce.number().int().prefault(1),
  _当前区域: z.string().prefault(''),
  _当前房间类型: z.string().prefault(''),
  $当前事件: z.string().prefault(''),
  // 事件房结局判定接口：AI 写入 结局一/结局二/结局三，前端结算后在离开事件房时清空
  判定结果: z.string().prefault(''),
  // 本局已触发过的事件（重生时清空），用于事件去重
  $已触发事件: z.array(z.string()).prefault([]),
  // 事件结局的结算进度：待结算（刚判定）→ 待操作（等待玩家点结算按钮）→ 已完成
  $事件操作: z
    .object({
      事件: z.string().prefault(''),
      结局: z.string().prefault(''),
      阶段: z.enum(['', '待结算', '待操作', '已完成']).prefault(''),
      数据: z.string().prefault(''),
    })
    .prefault({}),
  // 待注入下一条 user 楼层的事件结算说明
  $事件结算通知: z.array(z.string()).prefault([]),
  // 限时 / 本层 / 领主战修正
  $战斗修正: z
    .array(
      z
        .object({
          来源: z.string().prefault(''),
          对象: z.enum(['自身', '敌方', '双方']).prefault('自身'),
          效果: z.string().prefault(''),
          数值: z.coerce.number().prefault(0),
          范围: z.enum(['下N场', '本层下N场', '本层', '本层领主战', '本层非领主战']).prefault('下N场'),
          剩余: z.coerce.number().prefault(0),
        })
        .prefault({}),
    )
    .prefault([]),
  // 延迟奖励：每进入一个房间剩余房间 -1，归零时发放
  $延迟奖励: z
    .array(
      z
        .object({
          来源: z.string().prefault(''),
          剩余房间: z.coerce.number().prefault(0),
          奖励: z.string().prefault(''),
          移除状态: z.string().prefault(''),
        })
        .prefault({}),
    )
    .prefault([]),
  // 本层临时替换的卡牌 / 主动技，离开本层时换回
  $临时替换: z
    .array(
      z
        .object({
          来源: z.string().prefault(''),
          字段: z.enum(['_技能', '$主动']).prefault('_技能'),
          槽位: z.coerce.number().int().prefault(0),
          原名: z.string().prefault(''),
          原附魔: z.string().prefault(''),
          现名: z.string().prefault(''),
        })
        .prefault({}),
    )
    .prefault([]),
  _对手名称: z.string().prefault(''),
  $是否已击败商人: z.boolean().prefault(false),
  _友好的领主: z.array(z.string()).prefault([]),
  在场人物: z.array(z.string()).prefault([]),

  // 统计数据（AI不可见）
  $统计: z.object({
    当前层已过房间: z.coerce.number().prefault(0),
    累计已过房间: z.coerce.number().prefault(0),
    累计经过战斗: z.coerce.number().prefault(0),
    累计经过温泉: z.coerce.number().prefault(0),
    累计经过宝箱: z.coerce.number().prefault(0),
    累计经过商店: z.coerce.number().prefault(0),
    累计经过神像: z.coerce.number().prefault(0),
    累计经过事件: z.coerce.number().prefault(0),
  }).prefault({}),
  // 当前层实际走过的地图节点。字符串是旧存档兼容格式，新数据使用坐标对象。
  $路径: z
    .array(
      z.union([
        z.string(),
        z
          .object({
            x: z.coerce.number().int().min(1).max(6).prefault(1),
            房间类型: z.string().prefault(''),
          })
          .prefault({}),
      ]),
    )
    .prefault([]),
  // 四条路线，每条路线的数组下标隐含 y=1..9。
  $地图: z
    .array(
      z
        .array(
          z
            .object({
              x: z.coerce.number().int().min(1).max(6).prefault(1),
              房间类型: z.string().prefault('战斗房'),
              神像类型: z.enum(['白神像', '黑神像']).optional(),
            })
            .prefault({}),
        )
        .prefault([]),
    )
    .prefault([]),

  // 角色好感度 - 动态角色名
  角色: z
    .record(
      z.string().describe('角色名'),
      z.object({
        好感度: z.coerce.number().transform(v => _.clamp(v, -200, 200)).prefault(0),
      }).prefault({ 好感度: 0 }),
    )
    .prefault({}),
});
export type Schema = z.output<typeof Schema>;
