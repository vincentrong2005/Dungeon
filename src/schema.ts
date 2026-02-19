export const Schema = z.object({
  // 人物属性
  _血量: z.coerce.number().prefault(10),
  _血量上限: z.coerce.number().prefault(10),
  _魔量: z.coerce.number().prefault(1),
  _金币: z.coerce.number().prefault(0),
  $初始血量上限: z.coerce.number().prefault(10),
  $初始魔量: z.coerce.number().prefault(1),
  $初始金币: z.coerce.number().prefault(0),
  _技能: z.array(z.string()).length(9).prefault(['', '', '', '', '', '', '', '', '']),
  _负面状态: z.array(z.string()).prefault([]),
  $被动: z.string().prefault(''),
  $主动: z.array(z.string()).length(2).prefault(['', '']),
  _圣遗物: z.record(z.string().describe('圣遗物名'), z.coerce.number().describe('数量')).prefault({}),

  // 计算属性（由其他脚本操控）
  $最大点数: z.coerce.number().prefault(0),
  $最小点数: z.coerce.number().prefault(0),
  $星期: z.coerce.number().transform(v => _.clamp(v, 1, 7)).prefault(1),
  $难度: z.enum(['简单', '普通', '困难', '地狱', '自定义']).prefault('普通'),
  $自定义影响: z.array(z.string().describe('自选buff/debuff')).prefault([]),

  // 游戏状态
  当前区域: z.string().prefault(''),
  当前房间类型: z.string().prefault(''),
  _当前事件: z.string().prefault(''),
  _对手名称: z.string().prefault(''),
  _是否已击败商人: z.boolean().prefault(false),
  _友好的领主: z.array(z.string().describe('领主名')).prefault([]),
  在场人物: z.array(z.string().describe('角色名')).prefault([]),

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
    累计经过问号: z.coerce.number().prefault(0),
    累计经过陷阱: z.coerce.number().prefault(0),
  }).prefault({}),

  // 角色好感度 - 动态角色名
  角色: z
    .record(
      z.string().describe('角色名'),
      z.object({
        好感度: z.coerce.number().transform(v => _.clamp(v, -100, 100)).prefault(0),
      }).prefault({ 好感度: 0 }),
    )
    .prefault({}),
});
export type Schema = z.output<typeof Schema>;