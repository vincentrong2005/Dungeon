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
  _技能: z.array(z.string()).length(9).prefault(['', '', '', '', '', '', '', '', '']),
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
    累计经过陷阱: z.coerce.number().prefault(0),
  }).prefault({}),
  $路径: z.array(z.string()).prefault([]),

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
