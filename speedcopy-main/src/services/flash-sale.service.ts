import API_CONFIG from '../config/api.config';

export interface FlashSaleTimer {
  isActive: boolean;
  endTime: string;
  timeRemaining: {
    hours: number;
    minutes: number;
    seconds: number;
  };
  discount: {
    percentage: number;
    maxAmount: number;
  };
  title: string;
  subtitle: string;
}

export interface FlashSaleProduct {
  id: string;
  name: string;
  originalPrice: number;
  salePrice: number;
  discount: number;
  image: string;
  category: string;
}

class FlashSaleService {
  private baseURL = `${API_CONFIG.BASE_URL}/api/flash-sale`;

  async getTimer(): Promise<{ success: boolean; data: FlashSaleTimer; message: string }> {
    try {
      const response = await fetch(`${this.baseURL}/timer`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch flash sale timer');
      }
      
      return data;
    } catch (error) {
      console.error('Flash sale timer error:', error);
      // Return fallback data if API fails
      return {
        success: true,
        data: {
          isActive: true,
          endTime: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
          timeRemaining: { hours: 5, minutes: 42, seconds: 18 },
          discount: { percentage: 30, maxAmount: 500 },
          title: "Flash Sale is Live",
          subtitle: "Limited time offers on selected items"
        },
        message: 'Using fallback timer data'
      };
    }
  }

  async getProducts(): Promise<{ success: boolean; data: { products: FlashSaleProduct[] }; message: string }> {
    try {
      const response = await fetch(`${this.baseURL}/products`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch flash sale products');
      }
      
      return data;
    } catch (error) {
      console.error('Flash sale products error:', error);
      return {
        success: false,
        data: { products: [] },
        message: 'Failed to fetch flash sale products'
      };
    }
  }
}

const flashSaleService = new FlashSaleService();
export default flashSaleService;