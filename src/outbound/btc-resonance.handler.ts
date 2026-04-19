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
      
      // 執行分析邏輯，抓取包含 MA 數值的完整資料
      const results = await Promise.all(intervals.map(itv => this.checkTrend(itv)));

      let bodyText = "";
      let resonanceScore = 0;
      let weeklyText = "";

      // 千分位與小數點格式化工具
      const fmt = (num: number) => num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      results.forEach(r => {
        if (r.itv === '1w') {
          // 週線的排版 (根據你的截圖，大寫且有神廟 icon)
          const icon = r.isBullish ? "🟢 BULLISH" : "🟡 BEARISH";
          weeklyText = `🏛️ Weekly [MA: ${fmt(r.ma)}]: ${icon}`;
        } else {
          // 4 個短中長時區的計算與排版
          if (r.isBullish) resonanceScore++;
          const icon = r.isBullish ? "🟢 Bullish" : "🟡 Bearish";
          // padEnd(3, ' ') 讓 1h, 1d 後面自動補空白，對齊 15m
          bodyText += `${r.itv.padEnd(3, ' ')} $ ${fmt(r.price)} [MA: ${fmt(r.ma)}] ${icon}\n`;
        }
      });

      // 取得台北與紐約時間
      const getFormattedTime = (timeZone: string) => {
        return new Intl.DateTimeFormat('en-US', {
          timeZone, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        }).format(new Date());
      };

      // 終極大合併！完全 100% 複製你的設計圖
      const finalPost = `----------------------------------------
🤖 JASON'S BOT
----------------------------------------
${bodyText.trimEnd()}

${weeklyText}
----------------------------------------
[TPE: ${getFormattedTime('Asia/Taipei')} | NYC: ${getFormattedTime('America/New_York')}] Broadcast Success
🔥 Resonance: ${resonanceScore}/4`;

      logger.info({ score: resonanceScore }, 'BTC resonance analysis completed');

      return {
        success: true,
        data: {
          // 我們把排版好的內容塞進這三個最常見的變數名，確保下一個 Nostr 發文節點一定抓得到
          content: finalPost,
          text: finalPost,
          message: finalPost,
          resonanceScore: resonanceScore,
          status: this.getStatusText(resonanceScore)
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({ error: errorMessage }, 'Failed to execute BTC resonance analysis');
      return { success: false, error: errorMessage };
    }
  }

  private async checkTrend(interval: string) {
    // 限制 limit=20，因為計算 MA20 必須要有準確的 20 根 K 線
    const response = await fetch(
      `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=${interval}&limit=20`
    );
    const data = await response.json() as any[][];
    const prices = data.map((k: any[]) => parseFloat(k[4] as string));
    const currentPrice = prices[prices.length - 1]!;
    const ma20 = prices.reduce((a, b) => a + b, 0) / prices.length;

    // 將 ma 也回傳出去，這樣排版系統才抓得到數字
    return {
      itv: interval,
      price: currentPrice,
      ma: ma20,
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
