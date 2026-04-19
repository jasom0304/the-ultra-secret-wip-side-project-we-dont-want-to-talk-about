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
    const ma20 = prices.slice(-21, -1).reduce((a: number, b: number) => a + b, 0) / 20;
    return { price: currentPrice, ma: ma20 };
  }

  async execute(trigger: any, params: any): Promise<any> {
    console.log(">>> [TRIGGERED] 正在抓取幣安數據...");
    try {
      const [m15, h1, h4, d1, w1] = await Promise.all([
        this.getMA('BTCUSDT', '15m'),
        this.getMA('BTCUSDT', '1h'),
        this.getMA('BTCUSDT', '4h'),
        this.getMA('BTCUSDT', '1d'),
        this.getMA('BTCUSDT', '1w')
      ]);

      const getStatus = (p: number, m: number) => p > m ? "🟢 Bullish" : "🟡 Bearish";
      const checkScore = (p: number, m: number) => p > m ? 1 : 0;
      const resonance = checkScore(m15.price, m15.ma) + checkScore(h1.price, h1.ma) + 
                        checkScore(h4.price, h4.ma) + checkScore(d1.price, d1.ma);

      const now = new Date();
      const tpe = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Taipei', hour12: false });
      const nyc = now.toLocaleTimeString('en-GB', { timeZone: 'America/New_York', hour12: false });

      const content = `------------------------------------------------------\n` +
                      `🤖 JASON'S BOT\n` +
                      `------------------------------------------------------\n` +
                      `15m $ ${m15.price.toLocaleString()} [MA: ${m15.ma.toFixed(2)}] ${getStatus(m15.price, m15.ma)}\n` +
                      `1h $ ${h1.price.toLocaleString()} [MA: ${h1.ma.toFixed(2)}] ${getStatus(h1.price, h1.ma)}\n` +
                      `4h $ ${h4.price.toLocaleString()} [MA: ${h4.ma.toFixed(2)}] ${getStatus(h4.price, h4.ma)}\n` +
                      `1d $ ${d1.price.toLocaleString()} [MA: ${d1.ma.toFixed(2)}] ${getStatus(d1.price, d1.ma)}\n\n` +
                      `🏛️ Weekly [MA: ${w1.ma.toFixed(2)}] : ${getStatus(w1.price, w1.ma).toUpperCase()}\n` +
                      `------------------------------------------------------\n` +
                      `[TPE: ${tpe} | NYC: ${nyc}] Broadcast Success\n` +
                      `🔥 Resonance: ${resonance}/4`;

      console.log(">>> [SUCCESS] 分析完成");
      return { success: true, data: { content } };
    } catch (error: any) {
      console.error(">>> [ERROR] Handler 失敗:", error.message);
      return { success: false, error: error.message };
    }
  }
}
