import { ActionHandler } from './handler.interface';

export class BtcResonanceHandler implements ActionHandler {
  // 監控的時區
  private intervals = ['15m', '1h', '4h', '1d', '1w'];

  async handle(payload: any): Promise<any> {
    try {
      console.log('JasonBot: Starting BTC resonance analysis...');
      
      // 同步抓取所有時區的數據
      const results = await Promise.all(this.intervals.map(itv => this.checkTrend(itv)));

      let bullishCount = 0;
      const details: any = {};

      results.forEach((r: any) => {
        details[r.itv] = r;
        if (r.isBullish) bullishCount++;
      });

      // 根據分數給出狀態描述
      const statusText = this.getStatusText(bullishCount);

      return {
        resonanceScore: bullishCount,
        status: statusText,
        price: details['15m']?.price || 'N/A',
        // 讓 ESP32 解析，放純數據 JSON 字串
        rawJson: JSON.stringify({
          score: bullishCount,
          price: details['15m']?.price,
          ts: Date.now()
        })
      };
    } catch (error) {
      console.error('BtcResonanceHandler Error:', error);
      throw error;
    }
  }

  private async checkTrend(interval: string) {
    const response = await fetch(
      `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=${interval}&limit=20`
    );
    const data: any = await response.json();
    const prices = data.map((k: any) => parseFloat(k[4]));
    const currentPrice = prices[prices.length - 1];
    const ma20 = prices.reduce((a: any, b: any) => a + b, 0) / prices.length;

    return {
      itv: interval,
      price: currentPrice.toFixed(2),
      isBullish: currentPrice > ma20
    };
  }

  private getStatusText(score: number): string {
    if (score >= 4) return "Strong Bullish (Long)";
    if (score === 3) return "Bullish Bias";
    if (score === 2) return "Neutral / Choppy";
    return "Bearish (Short)";
  }
}
