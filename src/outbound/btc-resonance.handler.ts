import { Handler } from './handler.interface.js';
import axios from 'axios';

export class BtcResonanceHandler implements Handler {
  readonly type = "btc-resonance-analyzer";
  readonly name = "BTC Resonance Analyzer";

  async initialize(): Promise<void> {}
  async shutdown(): Promise<void> {}

  // 內部工具：抓取幣安 K 線並計算 MA20
  private async getMA(symbol: string, interval: string): Promise<{price: number, ma: number}> {
    const res = await axios.get(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=21`);
    const prices = res.data.map((k: any) => parseFloat(k[4]));
    const currentPrice = prices[prices.length - 1];
    // 取前 20 根的平均值
    const ma20 = prices.slice(-21, -1).reduce((a: number, b: number) => a + b, 0) / 20;
    return { price: currentPrice, ma: ma20 };
  }

  async execute(trigger: any, params: any): Promise<any> {
    console.log(">>> [TRIGGERED] 執行極致排版分析...");
    try {
      // 1. 同步抓取所有時框數據 (15m, 1h, 4h, 1d, 1w)
      const [m15, h1, h4, d1, w1] = await Promise.all([
        this.getMA('BTCUSDT', '15m'),
        this.getMA('BTCUSDT', '1h'),
        this.getMA('BTCUSDT', '4h'),
        this.getMA('BTCUSDT', '1d'),
        this.getMA('BTCUSDT', '1w')
      ]);

      // 2. 格式化工具
      const formatP = (p: number) => p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const formatM = (m: number) => m.toFixed(2);
      const getIcon = (p: number, m: number) => p > m ? "🟢" : "🟡";
      const getStatus = (p: number, m: number) => p > m ? "Bullish" : "Bearish";
      
      // 3. 計算共振分數與硬體訊號
      const resonance = [m15, h1, h4, d1].filter(x => x.price > x.ma).length;
      const trend_signal = resonance >= 3 ? "🟢" : "🟡";

      // 4. 計算兩地時間
      const now = new Date();
      const tpe = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Taipei', hour12: false });
      const nyc = now.toLocaleTimeString('en-GB', { timeZone: 'America/New_York', hour12: false });

      // 5. 按照圖片 1:1 還原字串排版 (虛線、空白、Emoji 完全對齊)
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

      console.log(`>>> [SUCCESS] 分析完畢，目前共振分: ${resonance}`);
      
      // 回傳封裝數據，content 給手機看，trend_signal 給 ESP32 用
      return { 
        success: true, 
        data: { 
          content, 
          trend_signal 
        } 
      };

    } catch (error: any) {
      console.error(">>> [ERROR] 分析失敗:", error.message);
      return { success: false, error: error.message };
    }
  }
}
