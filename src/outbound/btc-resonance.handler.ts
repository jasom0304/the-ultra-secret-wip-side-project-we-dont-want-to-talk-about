import { logger } from '../persistence/logger.js';
import type { Handler, HandlerResult, HandlerConfig } from './handler.interface.js';

export class BtcResonanceHandler implements Handler {
  readonly name = 'BTC Resonance Handler';
  readonly type = 'btc-resonance'; // YAML 檔案呼叫時對應的類型名稱

  async initialize(): Promise<void> {
    logger.info('BTC resonance handler initialized');
  }

  async execute(config: HandlerConfig, _context: Record<string, unknown>): Promise<HandlerResult> {
    try {
      const intervals = ['15m', '1h', '4h', '1d', '1w'];
      
      // 執行分析邏輯
      const results = await Promise.all(intervals.map(itv => this.checkTrend(itv)));

      let bullishCount = 0;
      const details: Record<string, any> = {};

      results.forEach((r: any) => {
        details[r.itv] = r;
        if (r.isBullish) bullishCount++;
      });

      const status = this.getStatusText(bullishCount);

      logger.info({ score: bullishCount, status }, 'BTC resonance analysis completed');

      return {
        success: true,
        data: {
          resonanceScore: bullishCount,
          status: status,
          price: details['15m']?.price || 'N/A',
          rawJson: JSON.stringify({
            score: bullishCount,
            price: details['15m']?.price,
            ts: Date.now()
          })
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({ error: errorMessage }, 'Failed to execute BTC resonance analysis');
      return { success: false, error: errorMessage };
    }
  }

  private async checkTrend(interval: string) {
    const response = await fetch(
      `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=${interval}&limit=20`
    );
    const data = await response.json() as any[][];
    const prices = data.map((k: any[]) => parseFloat(k[4] as string));
    const currentPrice = prices[prices.length - 1]!;
    const ma20 = prices.reduce((a, b) => a + b, 0) / prices.length;

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

  async shutdown(): Promise<void> {
    logger.info('BTC resonance handler shut down');
  }
}
