import { Handler } from './handler.interface.js';
import axios from 'axios';

export class BtcResonanceHandler implements Handler {
  readonly type = "btc-resonance-analyzer";
  readonly name = "BTC Resonance Analyzer";

  async initialize(): Promise<void> {}
  async shutdown(): Promise<void> {}

  private async getMA(symbol: string, interval: string): Promise<{price: number, ma: number}> {
    const res = await axios.get(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=21`);
    const prices = res.data.map((k: any) => parseFloat(k[4]));
    const currentPrice = prices[prices.length - 1];
    // 計算前 20 根 K 線的 MA20
    const ma20 = prices.slice(-21, -1).reduce((a: number, b: number) => a + b, 0) / 20;
    return { price: currentPrice, ma: ma20 };
  }

  async execute(trigger: any, params: any): Promise<any> {
    console.log(">>> [TRIGGERED] 執行極致排版分析...");
    try {
      const [m15, h1, h4, d1, w1] = await Promise.all([
        this.getMA('BTCUSDT', '15m'),
        this.getMA('BTCUSDT', '1h'),
        this.getMA('BTCUSDT', '4h'),
        this.getMA('BTCUSDT', '1d'),
        this.getMA('BTCUSDT', '1w')
      ]);

      // --- 對齊邏輯工具 ---
      const fixP = (p: number) => p.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).padStart(10, ' ');
      const fixM = (m: number) => m.toFixed(1).padStart(9, ' ');
      const getStatus = (p: number, m: number) => p > m ? "Bullish" : "Bearish";
      
      const resonance = [m15, h1, h4, d1].filter(x => x.price > x.ma).length;
      const now = new Date();
      const tpe = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Taipei', hour12: false });
      const nyc = now.toLocaleTimeString('en-GB', { timeZone: 'America/New_York', hour12: false });

      // --- 核心排版內容 (使用 Markdown Code Block 確保等寬對齊) ---
      const content = 
`🤖 JASON'S BTC RESONANCE
\`\`\`
TIME | PRICE      | MA20      | STATUS
-----|------------|-----------|---------
15m  | ${fixP(m15.price)} | ${fixM(m15.ma)} | ${getStatus(m15.price, m15.ma)}
01h  | ${fixP(h1.price)} | ${fixM(h1.ma)} | ${getStatus(h1.price, h1.ma)}
04h  | ${fixP(h4.price)} | ${fixM(h4.ma)} | ${getStatus(h4.price, h4.ma)}
24h  | ${fixP(d1.price)} | ${fixM(d1.ma)} | ${getStatus(d1.price, d1.ma)}
-----|------------|-----------|---------
WKL  | MA: ${w1.ma.toFixed(1).padStart(7, ' ')} | SCORE: ${resonance}/4  | ${w1.price > w1.ma ? 'UP' : 'DN'}
\`\`\`
⏰ TPE: ${tpe} | NYC: ${nyc}
🔥 Broadcast Success`;

      console.log(">>> [SUCCESS] 內容已生成，對齊補丁已套用");
      return { success: true, data: { content } };
    } catch (error: any) {
      console.error(">>> [ERROR] 分析失敗:", error.message);
      return { success: false, error: error.message };
    }
  }
}
