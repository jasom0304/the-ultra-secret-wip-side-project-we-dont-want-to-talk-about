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
    try {
      const [m15, h1, h4, d1, w1] = await Promise.all([
        this.getMA('BTCUSDT', '15m'),
        this.getMA('BTCUSDT', '1h'),
        this.getMA('BTCUSDT', '4h'),
        this.getMA('BTCUSDT', '1d'),
        this.getMA('BTCUSDT', '1w')
      ]);

      const formatP = (p: number) => p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const formatM = (m: number) => m.toFixed(2);
      const getIcon = (p: number, m: number) => p > m ? "🟢" : "🟡";
      const getStatus = (p: number, m: number) => p > m ? "Bullish" : "Bearish";
      
      const resonance = [m15, h1, h4, d1].filter(x => x.price > x.ma).length;
      const trend_signal = resonance >= 3 ? "🟢" : "🟡";

      const now = new Date();
      const tpe = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Taipei', hour12: false });
      const nyc = now.toLocaleTimeString('en-GB', { timeZone: 'America/New_York', hour12: false });

      // --- 這裡完全照你的圖片：虛線、Emoji、每一行都有 🟢/🟡 ---
      const content = 
`----------------------------------------------------------
🤖 JASON'S BOT
----------------------------------------------------------
15m $ ${formatP(m15.price)} [MA: ${formatM(m15.ma)}] ${getIcon(m15.price, m15.ma)} ${getStatus(m15.price, m15.ma)}
1h $ ${formatP(h1.price)} [MA: ${formatM(h1.ma)}] ${getIcon(h1.price, h1.ma)} ${getStatus(h1.price, h1.ma)}
4h $ ${formatP(h4.price)} [MA: ${formatM(h4.ma)}] ${getIcon(h4.price, h4.ma)} ${getStatus(h4.price, h4.ma)}
1d $ ${formatP(d1.price)} [MA: ${formatM(d1.ma)}] ${getIcon(d1.price, d1.ma)} ${getStatus(d1.price, d1.ma)}

🏛️ Weekly [MA: ${formatM(w1.ma)}] : ${getIcon(w1.price, w1.ma)} ${getStatus(w1.price, w1.ma).toUpperCase()}
----------------------------------------------------------
[TPE: ${tpe} | NYC: ${nyc}] Broadcast Success
🔥 Resonance: ${resonance}/4`;

      return { success: true, data: { content, trend_signal } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
