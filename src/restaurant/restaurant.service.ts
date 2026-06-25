import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRestaurantDto, UpdateRestaurantDto, GetRestaurantsFilterDto } from './dto/restaurant.dto';
import { OrderStatus } from '@prisma/client';
import * as fs from 'fs';

@Injectable()
export class RestaurantService {
  constructor(private readonly prisma: PrismaService) {
    setTimeout(async () => {
      try {
        const allRestaurants = await this.prisma.restaurant.findMany({ select: { id: true, name: true, userId: true } });
        const allOrders = await this.prisma.order.findMany({ select: { id: true, orderNumber: true, restaurantId: true, restaurantName: true, userId: true } });
        const allUsers = await this.prisma.user.findMany({ select: { id: true, email: true, role: true } });
        fs.writeFileSync('j:\\A-Intern\\Trinco_Bites\\backend-debug.json', JSON.stringify({
          allRestaurants,
          allOrdersCount: allOrders.length,
          allOrders,
          allUsers
        }, null, 2));
      } catch (e) {
        try {
          fs.writeFileSync('j:\\A-Intern\\Trinco_Bites\\backend-debug.json', JSON.stringify({ error: e.message }, null, 2));
        } catch (err) {}
      }
    }, 1000);
  }

  async getProfile(userId: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { userId },
      include: {
        categories: true,
        menuItems: {
          include: {
            category: true,
          },
        },
      },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant profile not found for this user');
    }

    return {
      message: 'Restaurant profile retrieved successfully',
      restaurant,
    };
  }

  async createProfile(userId: string, dto: CreateRestaurantDto) {
    // Check if user already has a restaurant profile
    const existing = await this.prisma.restaurant.findUnique({
      where: { userId },
    });

    if (existing) {
      throw new ConflictException('Restaurant profile already exists for this user. Use PUT to update.');
    }

    // Prepare data, parsing string coordinates if necessary
    const data = this.prepareData(dto);

    const restaurant = await this.prisma.restaurant.create({
      data: {
        ...data,
        userId,
      },
      include: {
        categories: true,
        menuItems: {
          include: {
            category: true,
          },
        },
      },
    });

    return {
      message: 'Restaurant profile created successfully',
      restaurant,
    };
  }

  async updateProfile(userId: string, dto: UpdateRestaurantDto) {
    const existing = await this.prisma.restaurant.findUnique({
      where: { userId },
    });

    if (!existing) {
      throw new NotFoundException('Restaurant profile not found. Use POST to create it first.');
    }

    const data = this.prepareData(dto);

    const restaurant = await this.prisma.restaurant.update({
      where: { userId },
      data,
      include: {
        categories: true,
        menuItems: {
          include: {
            category: true,
          },
        },
      },
    });

    return {
      message: 'Restaurant profile updated successfully',
      restaurant,
    };
  }

  async getPublicProfile(id: string) {
    const restaurant = await this.prisma.restaurant.findFirst({
      where: {
        id,
        showPublicly: true,
      },
      include: {
        categories: {
          where: {
            status: 'Active',
          },
          orderBy: {
            displayOrder: 'asc',
          },
        },
        menuItems: {
          where: {
            isAvailable: true,
          },
          include: {
            category: true,
          },
          orderBy: {
            name: 'asc',
          },
        },
      },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found or is not currently public');
    }

    return {
      message: 'Public restaurant profile retrieved successfully',
      restaurant,
    };
  }

  async listPublicRestaurants(filters: GetRestaurantsFilterDto = {}) {
    const restaurants = await this.prisma.restaurant.findMany({
      where: {
        showPublicly: true,
        description: {
          not: null,
        },
        streetAddress: {
          not: null,
        },
      },
      include: {
        categories: {
          where: {
            status: 'Active',
          },
          orderBy: {
            displayOrder: 'asc',
          },
        },
        offers: {
          where: {
            status: 'ACTIVE',
          },
        },
        menuItems: {
          where: {
            isAvailable: true,
          },
          include: {
            category: true,
          },
          orderBy: {
            name: 'asc',
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    let filtered = [...restaurants];

    // Helper: Category Mapping
    const getPrimaryCategory = (cuisineTypes: string[]) => {
      let category = cuisineTypes?.[0] || "Srilankan Foods";
      if (category === "SRILANKAN") category = "Rice and Curry";
      else if (typeof category === "string" && category.toUpperCase() === "SOUTH_INDIAN") category = "South Indian";
      else if (typeof category === "string") {
        category = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase().replace("_", " ");
      }
      return category;
    };

    // Helper: Robust Category Matching
    const isCategoryMatch = (name1: string, name2: string) => {
      const n1 = name1.toLowerCase().trim();
      const n2 = name2.toLowerCase().trim();
      if (n1 === n2) return true;
      if (n1 === n2 + 's' || n2 === n1 + 's') return true;
      if (n1 === n2 + 'es' || n2 === n1 + 'es') return true;
      if ((n1.includes('biryani') || n1.includes('briyani')) && (n2.includes('biryani') || n2.includes('briyani'))) return true;
      if (n1.length >= 4 && n2.length >= 4 && (n1.startsWith(n2.substring(0, 4)) || n2.startsWith(n1.substring(0, 4)))) return true;
      return false;
    };

    // Helper: Parse Delivery Minutes
    const parseDeliveryMinutes = (deliveryTime: string) => {
      if (!deliveryTime) return Number.POSITIVE_INFINITY;
      const values = deliveryTime.match(/\d+/g)?.map(Number) ?? [];
      return values.length > 0 ? Math.max(...values) : Number.POSITIVE_INFINITY;
    };

    // Helper: Check if Restaurant Open
    const isRestaurantOpen = (r: any) => {
      if (r.temporaryClosure === true) return false;
      if (r.holidayMode === true) return false;
      if (r.vacationMode === true) return false;
      if (r.acceptOrders === false) return false;

      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();

      const parseTime = (timeStr: string) => {
        if (!timeStr) return 0;
        const parts = timeStr.split(" ");
        if (parts.length < 2) return 0;
        const [time, modifier] = parts;
        let [hours, minutes] = time.split(":").map(Number);
        if (modifier === "PM" && hours < 12) hours += 12;
        if (modifier === "AM" && hours === 12) hours = 0;
        return hours * 60 + minutes;
      };

      let openingTimeStr = r.openingTime;
      let closingTimeStr = r.closingTime;

      if (r.weeklyHours) {
        const daysMap = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const currentDay = daysMap[now.getDay()];
        let weekly = r.weeklyHours;
        if (typeof weekly === 'string') {
          try {
            weekly = JSON.parse(weekly);
          } catch (e) {
            weekly = null;
          }
        }
        if (weekly && weekly[currentDay]) {
          const todayHours = weekly[currentDay];
          if (!todayHours.open) {
            return false;
          }
          openingTimeStr = todayHours.from || openingTimeStr;
          closingTimeStr = todayHours.to || closingTimeStr;
        }
      }

      if (!openingTimeStr || !closingTimeStr) return false;

      const open = parseTime(openingTimeStr);
      const close = parseTime(closingTimeStr);

      if (close < open) {
        return currentTime >= open || currentTime <= close;
      }
      return currentTime >= open && currentTime <= close;
    };

    // Helper: Check Menu Item Time Availability (Breakfast/Lunch/Dinner)
    const isMenuItemTimeAvailable = (timeAvailability: string) => {
      if (!timeAvailability || timeAvailability === 'All Day') return true;
      const hour = new Date().getHours();
      if (timeAvailability === 'Breakfast') return hour >= 6 && hour < 11;
      if (timeAvailability === 'Lunch') return hour >= 11 && hour < 16;
      if (timeAvailability === 'Dinner') return hour >= 16 && hour < 23;
      return true;
    };

    // Filter: Search
    if (filters.search) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          (r.description && r.description.toLowerCase().includes(q)),
      );
    }

    // Filter: Category
    if (filters.category && filters.category !== 'All') {
      const catQuery = filters.category.toLowerCase();
      filtered = filtered.filter((r) => {
        // A restaurant must have at least one active, in-stock, and time-available menu item in this category
        return r.menuItems.some((item) => {
          const itemCat = item.category?.name || '';
          const primaryCat = getPrimaryCategory(r.cuisineTypes);
          const matchesCategory = isCategoryMatch(itemCat, catQuery) ||
                                  isCategoryMatch(primaryCat, catQuery) ||
                                  r.categories.some((c) => isCategoryMatch(c.name, catQuery));
          
          return matchesCategory &&
                 item.stock > 0 &&
                 isMenuItemTimeAvailable(item.timeAvailability || 'All Day');
        });
      });
    }

    // Filter: Open Now
    if (filters.openNow === 'true' || filters.openNow === true) {
      filtered = filtered.filter((r) => isRestaurantOpen(r));
    }

    // Filter: Under 30 min
    if (filters.under30 === 'true' || filters.under30 === true) {
      filtered = filtered.filter(
        (r) => parseDeliveryMinutes(r.deliveryTime || '') <= 30,
      );
    }

    // Filter: Min Rating
    if (filters.minRating) {
      const minR = parseFloat(filters.minRating as string);
      if (!isNaN(minR)) {
        filtered = filtered.filter((r) => (r.rating ?? 4.0) >= minR);
      }
    }

    // Filter: With Offers
    if (filters.withOffers === 'true' || filters.withOffers === true) {
      filtered = filtered.filter((r) => r.offers.length > 0);
    }

    // Filter: Dietary
    if (filters.dietary && filters.dietary !== 'ALL') {
      const dietary = filters.dietary.toUpperCase();
      if (dietary === 'VEG') {
        filtered = filtered.filter((r) => r.vegetarianFriendly === true);
      } else if (dietary === 'NON_VEG') {
        filtered = filtered.filter((r) =>
          r.menuItems.some(
            (item) =>
              item.name.toLowerCase().includes('chicken') ||
              item.name.toLowerCase().includes('beef') ||
              item.name.toLowerCase().includes('mutton') ||
              item.name.toLowerCase().includes('fish') ||
              item.name.toLowerCase().includes('prawn') ||
              item.name.toLowerCase().includes('seafood'),
          ),
        );
      } else if (dietary === 'HALAL') {
        filtered = filtered.filter((r) => r.halalFriendly === true);
      }
    }

    // Sorting
    const sortBy = filters.sortBy || 'name';
    const sortOrder = filters.sortOrder || 'asc';
    const isAsc = sortOrder === 'asc';

    filtered.sort((a, b) => {
      if (sortBy === 'rating') {
        const ratingA = a.rating ?? 4.0;
        const ratingB = b.rating ?? 4.0;
        return isAsc ? ratingA - ratingB : ratingB - ratingA;
      } else if (sortBy === 'deliveryTime') {
        const timeA = parseDeliveryMinutes(a.deliveryTime || '');
        const timeB = parseDeliveryMinutes(b.deliveryTime || '');
        return isAsc ? timeA - timeB : timeB - timeA;
      } else {
        const nameA = a.name.toLowerCase();
        const nameB = b.name.toLowerCase();
        if (nameA < nameB) return isAsc ? -1 : 1;
        if (nameA > nameB) return isAsc ? 1 : -1;
        return 0;
      }
    });

    return {
      message: 'Public restaurants retrieved successfully',
      count: filtered.length,
      restaurants: filtered,
    };
  }

  async getDashboardStats(userId: string, timeframe: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { userId },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant profile not found for this user');
    }

    const restaurantId = restaurant.id;
    const now = new Date();
    let startDate: Date;
    let prevStartDate: Date;
    let prevEndDate: Date;

    if (timeframe === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      prevStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      prevEndDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, -1);
    } else if (timeframe === '30days') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      prevStartDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      prevEndDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else { // '7days' is the default
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      prevStartDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      prevEndDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // 1. Total Orders count
    const totalOrders = await this.prisma.order.count({
      where: {
        restaurantId,
        createdAt: { gte: startDate },
      },
    });

    const prevTotalOrders = await this.prisma.order.count({
      where: {
        restaurantId,
        createdAt: { gte: prevStartDate, lt: startDate },
      },
    });

    // 2. Revenue (excluding CANCELLED orders)
    const revenueSum = await this.prisma.order.aggregate({
      where: {
        restaurantId,
        status: { not: 'CANCELLED' },
        createdAt: { gte: startDate },
      },
      _sum: { total: true },
    });
    const revenue = revenueSum._sum.total || 0;

    const prevRevenueSum = await this.prisma.order.aggregate({
      where: {
        restaurantId,
        status: { not: 'CANCELLED' },
        createdAt: { gte: prevStartDate, lt: startDate },
      },
      _sum: { total: true },
    });
    const prevRevenue = prevRevenueSum._sum.total || 0;

    // 3. Pending Orders (ORDER_RECEIVED, PREPARING, OUT_FOR_DELIVERY)
    const pendingOrders = await this.prisma.order.count({
      where: {
        restaurantId,
        status: { in: ['ORDER_RECEIVED', 'PREPARING', 'OUT_FOR_DELIVERY'] },
        createdAt: { gte: startDate },
      },
    });

    const prevPendingOrders = await this.prisma.order.count({
      where: {
        restaurantId,
        status: { in: ['ORDER_RECEIVED', 'PREPARING', 'OUT_FOR_DELIVERY'] },
        createdAt: { gte: prevStartDate, lt: startDate },
      },
    });

    // 4. Completed Orders (DELIVERED)
    const completedOrders = await this.prisma.order.count({
      where: {
        restaurantId,
        status: 'DELIVERED',
        createdAt: { gte: startDate },
      },
    });

    const prevCompletedOrders = await this.prisma.order.count({
      where: {
        restaurantId,
        status: 'DELIVERED',
        createdAt: { gte: prevStartDate, lt: startDate },
      },
    });

    // 5. Cancelled Orders
    const cancelledOrders = await this.prisma.order.count({
      where: {
        restaurantId,
        status: 'CANCELLED',
        createdAt: { gte: startDate },
      },
    });

    const prevCancelledOrders = await this.prisma.order.count({
      where: {
        restaurantId,
        status: 'CANCELLED',
        createdAt: { gte: prevStartDate, lt: startDate },
      },
    });

    // 6. Avg Rating from Reviews
    const ratingAggregate = await this.prisma.review.aggregate({
      where: {
        restaurantId,
        createdAt: { gte: startDate },
      },
      _avg: { rating: true },
    });
    const avgRating = ratingAggregate._avg.rating !== null ? Number(ratingAggregate._avg.rating.toFixed(1)) : (restaurant.rating || 5.0);

    const prevRatingAggregate = await this.prisma.review.aggregate({
      where: {
        restaurantId,
        createdAt: { gte: prevStartDate, lt: startDate },
      },
      _avg: { rating: true },
    });
    const prevAvgRating = prevRatingAggregate._avg.rating !== null ? Number(prevRatingAggregate._avg.rating.toFixed(1)) : (restaurant.rating || 5.0);

    // 7. Active Customers (unique userIds)
    const currentCustomers = await this.prisma.order.groupBy({
      by: ['userId'],
      where: {
        restaurantId,
        createdAt: { gte: startDate },
      },
    });
    const activeCustomers = currentCustomers.length;

    const prevCustomers = await this.prisma.order.groupBy({
      by: ['userId'],
      where: {
        restaurantId,
        createdAt: { gte: prevStartDate, lt: startDate },
      },
    });
    const prevActiveCustomers = prevCustomers.length;

    // 8. Monthly Earnings (start of current calendar month)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyEarningsSum = await this.prisma.order.aggregate({
      where: {
        restaurantId,
        status: { not: 'CANCELLED' },
        createdAt: { gte: startOfMonth },
      },
      _sum: { total: true },
    });
    const monthlyEarnings = monthlyEarningsSum._sum.total || 0;

    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    const prevMonthlyEarningsSum = await this.prisma.order.aggregate({
      where: {
        restaurantId,
        status: { not: 'CANCELLED' },
        createdAt: { gte: startOfPrevMonth, lte: endOfPrevMonth },
      },
      _sum: { total: true },
    });
    const prevMonthlyEarnings = prevMonthlyEarningsSum._sum.total || 0;

    // Helper functions for trends
    const calculateTrend = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? '+100.0%' : '0.0%';
      const pct = ((curr - prev) / prev) * 100;
      return (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%';
    };

    const calculateRatingTrend = (curr: number, prev: number) => {
      const diff = curr - prev;
      return (diff >= 0 ? '+' : '') + diff.toFixed(1);
    };

    // --- Chart Data Binnings ---
    const ordersForChart = await this.prisma.order.findMany({
      where: {
        restaurantId,
        status: { not: 'CANCELLED' },
        createdAt: { gte: startDate },
      },
      select: {
        total: true,
        createdAt: true,
      },
    });

    let chartData: { day: string; val: number }[] = [];

    if (timeframe === 'today') {
      const bins = [
        { label: '08:00', hour: 8, val: 0 },
        { label: '11:00', hour: 11, val: 0 },
        { label: '14:00', hour: 14, val: 0 },
        { label: '17:00', hour: 17, val: 0 },
        { label: '20:00', hour: 20, val: 0 },
        { label: '23:00', hour: 23, val: 0 },
      ];

      ordersForChart.forEach((order) => {
        const orderHour = order.createdAt.getHours();
        let minDiff = 24;
        let bestBinIdx = 0;
        bins.forEach((bin, idx) => {
          const diff = Math.abs(orderHour - bin.hour);
          if (diff < minDiff) {
            minDiff = diff;
            bestBinIdx = idx;
          }
        });
        bins[bestBinIdx].val += order.total;
      });

      chartData = bins.map((b) => ({ day: b.label, val: Math.round(b.val) }));
    } else if (timeframe === '30days') {
      const bins = [
        { label: 'Day 5', minDays: 25, maxDays: 29, val: 0 },
        { label: 'Day 10', minDays: 20, maxDays: 24, val: 0 },
        { label: 'Day 15', minDays: 15, maxDays: 19, val: 0 },
        { label: 'Day 20', minDays: 10, maxDays: 14, val: 0 },
        { label: 'Day 25', minDays: 5, maxDays: 9, val: 0 },
        { label: 'Day 30', minDays: 0, maxDays: 4, val: 0 },
      ];

      ordersForChart.forEach((order) => {
        const diffTime = now.getTime() - order.createdAt.getTime();
        const diffDays = Math.floor(diffTime / (24 * 60 * 60 * 1000));
        const matchedBin = bins.find((b) => diffDays >= b.minDays && diffDays <= b.maxDays);
        if (matchedBin) {
          matchedBin.val += order.total;
        }
      });

      chartData = bins.map((b) => ({ day: b.label, val: Math.round(b.val) }));
    } else { // 7days
      const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const bins: { label: string; dateStr: string; val: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        bins.push({
          label: weekdays[d.getDay()],
          dateStr: d.toDateString(),
          val: 0,
        });
      }

      ordersForChart.forEach((order) => {
        const orderDateStr = order.createdAt.toDateString();
        const matchedBin = bins.find((b) => b.dateStr === orderDateStr);
        if (matchedBin) {
          matchedBin.val += order.total;
        }
      });

      chartData = bins.map((b) => ({ day: b.label, val: Math.round(b.val) }));
    }

    // --- Popular Dishes ---
    const popularDishesInTimeframe = await this.prisma.orderItem.groupBy({
      by: ['menuItemId'],
      where: {
        restaurantId,
        createdAt: { gte: startDate },
        order: { status: { not: 'CANCELLED' } },
      },
      _sum: {
        quantity: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: 3,
    });

    let popularDishes: any[] = [];
    if (popularDishesInTimeframe.length > 0) {
      const itemIds = popularDishesInTimeframe.map((d) => d.menuItemId);
      const menuItems = await this.prisma.menuItem.findMany({
        where: { id: { in: itemIds } },
      });
      popularDishes = popularDishesInTimeframe.map((item) => {
        const menuItem = menuItems.find((m) => m.id === item.menuItemId);
        return {
          id: item.menuItemId,
          name: menuItem?.name || 'Unknown Item',
          price: menuItem?.price || 0,
          image: menuItem?.image || null,
          rating: 4.8,
          salesCount: item._sum.quantity || 0,
        };
      }).sort((a, b) => b.salesCount - a.salesCount);
    } else {
      const topMenuItems = await this.prisma.menuItem.findMany({
        where: { restaurantId },
        orderBy: { ordersCount: 'desc' },
        take: 3,
      });
      popularDishes = topMenuItems.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        image: item.image,
        rating: 4.8,
        salesCount: item.ordersCount,
      }));
    }

    // --- Recent Orders ---
    const recentOrdersDb = await this.prisma.order.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        items: true,
        user: true,
      },
    });

    const mapStatusToFrontendLocal = (status: OrderStatus): string => {
      switch (status) {
        case OrderStatus.ORDER_RECEIVED:
          return 'Pending';
        case OrderStatus.PREPARING:
          return 'Preparing';
        case OrderStatus.OUT_FOR_DELIVERY:
          return 'Out for Delivery';
        case OrderStatus.DELIVERED:
          return 'Completed';
        case OrderStatus.CANCELLED:
          return 'Cancelled';
        default:
          return 'Pending';
      }
    };

    const formatTimeAgo = (date: Date): string => {
      const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
      if (seconds < 60) return 'Just now';
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
      const days = Math.floor(hours / 24);
      return `${days} day${days === 1 ? '' : 's'} ago`;
    };

    const recentOrders = recentOrdersDb.map((order) => {
      const customerName = order.contactName || order.user.fullName || 'Guest';
      const initials = customerName
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2) || 'G';

      return {
        id: order.orderNumber,
        customer: {
          name: customerName,
          initials,
        },
        items: order.items.map((item) => ({
          quantity: item.quantity,
          name: item.name,
        })),
        amount: `LKR ${order.total.toLocaleString()}`,
        time: formatTimeAgo(order.createdAt),
        status: mapStatusToFrontendLocal(order.status),
      };
    });

    // --- Insights ---
    const hourCounts = new Array(24).fill(0);
    ordersForChart.forEach((order) => {
      const hour = new Date(order.createdAt).getHours();
      hourCounts[hour]++;
    });

    let peakHourVal = 19; // Default 7 PM
    let maxCount = 0;
    for (let h = 0; h < 24; h++) {
      if (hourCounts[h] > maxCount) {
        maxCount = hourCounts[h];
        peakHourVal = h;
      }
    }

    const formatHour = (h: number) => {
      const period = h >= 12 ? 'PM' : 'AM';
      const displayHour = h % 12 === 0 ? 12 : h % 12;
      return `${displayHour}:00 ${period}`;
    };
    const peakHour = formatHour(peakHourVal);

    // New Customers
    let newCustomersCount = 0;
    for (const cust of currentCustomers) {
      const prevCount = await this.prisma.order.count({
        where: {
          restaurantId,
          userId: cust.userId,
          createdAt: { lt: startDate },
        },
      });
      if (prevCount === 0) {
        newCustomersCount++;
      }
    }

    const refunds = await this.prisma.order.count({
      where: {
        restaurantId,
        refundInitiated: true,
        createdAt: { gte: startDate },
      },
    });

    const bestSeller = popularDishes.length > 0 ? popularDishes[0].name : 'N/A';

    // Distribution
    const totalAll = completedOrders + pendingOrders + cancelledOrders;
    const completedPercent = totalAll > 0 ? Math.round((completedOrders / totalAll) * 100) : 0;
    const pendingPercent = totalAll > 0 ? Math.round((pendingOrders / totalAll) * 100) : 0;
    const cancelledPercent = totalAll > 0 ? Math.max(0, 100 - completedPercent - pendingPercent) : 0;

    return {
      metrics: {
        totalOrders: String(totalOrders),
        todayRevenue: `LKR ${Math.round(revenue).toLocaleString()}`,
        pendingOrders: String(pendingOrders),
        completedOrders: String(completedOrders),
        cancelledOrders: String(cancelledOrders),
        avgRating: String(avgRating),
        activeCustomers: String(activeCustomers),
        monthlyEarnings: `LKR ${Math.round(monthlyEarnings).toLocaleString()}`,
        ordersTrend: calculateTrend(totalOrders, prevTotalOrders),
        revenueTrend: calculateTrend(revenue, prevRevenue),
        pendingTrend: calculateTrend(pendingOrders, prevPendingOrders),
        completedTrend: calculateTrend(completedOrders, prevCompletedOrders),
        cancelledTrend: calculateTrend(cancelledOrders, prevCancelledOrders),
        ratingTrend: calculateRatingTrend(avgRating, prevAvgRating),
        customersTrend: calculateTrend(activeCustomers, prevActiveCustomers),
        earningsTrend: calculateTrend(monthlyEarnings, prevMonthlyEarnings),
      },
      chartData,
      popularDishes,
      recentOrders,
      insights: {
        peakHour,
        bestSeller,
        refunds,
        newCustomers: newCustomersCount,
      },
      distribution: {
        cancelled: cancelledPercent,
      },
    };
  }

  async getAnalyticsStats(userId: string, timeframe: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { userId },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant profile not found for this user');
    }

    const restaurantId = restaurant.id;
    const now = new Date();
    let startDate: Date;
    let prevStartDate: Date;
    let prevEndDate: Date;

    if (timeframe === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      prevStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      prevEndDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, -1);
    } else if (timeframe === '30days') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      prevStartDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      prevEndDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (timeframe === '12months') {
      startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      prevStartDate = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
      prevEndDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    } else { // '7days'
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      prevStartDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      prevEndDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // 1. Total Orders count
    const totalOrders = await this.prisma.order.count({
      where: {
        restaurantId,
        createdAt: { gte: startDate },
      },
    });

    const prevTotalOrders = await this.prisma.order.count({
      where: {
        restaurantId,
        createdAt: { gte: prevStartDate, lt: startDate },
      },
    });

    // 2. Earnings/Revenue (excluding CANCELLED orders)
    const revenueSum = await this.prisma.order.aggregate({
      where: {
        restaurantId,
        status: { not: 'CANCELLED' },
        createdAt: { gte: startDate },
      },
      _sum: { total: true },
    });
    const totalEarnings = revenueSum._sum.total || 0;

    const prevRevenueSum = await this.prisma.order.aggregate({
      where: {
        restaurantId,
        status: { not: 'CANCELLED' },
        createdAt: { gte: prevStartDate, lt: startDate },
      },
      _sum: { total: true },
    });
    const prevTotalEarnings = prevRevenueSum._sum.total || 0;

    // 3. Average Order Value (AOV, non-cancelled)
    const nonCancelledOrdersCount = await this.prisma.order.count({
      where: {
        restaurantId,
        status: { not: 'CANCELLED' },
        createdAt: { gte: startDate },
      },
    });
    const avgOrderValue = nonCancelledOrdersCount > 0 ? Math.round(totalEarnings / nonCancelledOrdersCount) : 0;

    const prevNonCancelledOrdersCount = await this.prisma.order.count({
      where: {
        restaurantId,
        status: { not: 'CANCELLED' },
        createdAt: { gte: prevStartDate, lt: startDate },
      },
    });
    const prevAvgOrderValue = prevNonCancelledOrdersCount > 0 ? Math.round(prevTotalEarnings / prevNonCancelledOrdersCount) : 0;

    // 4. Cancelled Orders Rate
    const cancelledOrders = await this.prisma.order.count({
      where: {
        restaurantId,
        status: 'CANCELLED',
        createdAt: { gte: startDate },
      },
    });
    const cancelledRate = totalOrders > 0 ? Number(((cancelledOrders / totalOrders) * 100).toFixed(1)) : 0;

    const prevCancelledOrders = await this.prisma.order.count({
      where: {
        restaurantId,
        status: 'CANCELLED',
        createdAt: { gte: prevStartDate, lt: startDate },
      },
    });
    const prevCancelledRate = prevTotalOrders > 0 ? Number(((prevCancelledOrders / prevTotalOrders) * 100).toFixed(1)) : 0;

    // Trend calculation helper
    const calculateTrend = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? '+100.0%' : '0.0%';
      const pct = ((curr - prev) / prev) * 100;
      return (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%';
    };

    const metrics = {
      totalEarnings: Math.round(totalEarnings),
      totalOrders,
      avgOrderValue,
      cancelledRate,
      trends: {
        earnings: calculateTrend(totalEarnings, prevTotalEarnings),
        orders: calculateTrend(totalOrders, prevTotalOrders),
        aov: calculateTrend(avgOrderValue, prevAvgOrderValue),
        cancelled: calculateTrend(cancelledRate, prevCancelledRate),
      },
    };

    // 5. Sales Trend (charts over time)
    const ordersForChart = await this.prisma.order.findMany({
      where: {
        restaurantId,
        status: { not: 'CANCELLED' },
        createdAt: { gte: startDate },
      },
      select: {
        total: true,
        createdAt: true,
      },
    });

    let salesTrend: { label: string; revenue: number; orders: number }[] = [];

    if (timeframe === 'today') {
      const bins = [
        { label: '08:00', hour: 8, revenue: 0, orders: 0 },
        { label: '10:00', hour: 10, revenue: 0, orders: 0 },
        { label: '12:00', hour: 12, revenue: 0, orders: 0 },
        { label: '14:00', hour: 14, revenue: 0, orders: 0 },
        { label: '16:00', hour: 16, revenue: 0, orders: 0 },
        { label: '18:00', hour: 18, revenue: 0, orders: 0 },
        { label: '20:00', hour: 20, revenue: 0, orders: 0 },
        { label: '22:00', hour: 22, revenue: 0, orders: 0 },
      ];

      ordersForChart.forEach((order) => {
        const orderHour = order.createdAt.getHours();
        let minDiff = 24;
        let bestBinIdx = 0;
        bins.forEach((bin, idx) => {
          const diff = Math.abs(orderHour - bin.hour);
          if (diff < minDiff) {
            minDiff = diff;
            bestBinIdx = idx;
          }
        });
        bins[bestBinIdx].revenue += order.total;
        bins[bestBinIdx].orders += 1;
      });

      salesTrend = bins.map((b) => ({ label: b.label, revenue: Math.round(b.revenue), orders: b.orders }));
    } else if (timeframe === '30days') {
      const bins: { label: string; dateStr: string; revenue: number; orders: number }[] = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        bins.push({
          label: `Day ${30 - i}`,
          dateStr: d.toDateString(),
          revenue: 0,
          orders: 0,
        });
      }

      ordersForChart.forEach((order) => {
        const orderDateStr = order.createdAt.toDateString();
        const matchedBin = bins.find((b) => b.dateStr === orderDateStr);
        if (matchedBin) {
          matchedBin.revenue += order.total;
          matchedBin.orders += 1;
        }
      });

      salesTrend = bins.map((b) => ({ label: b.label, revenue: Math.round(b.revenue), orders: b.orders }));
    } else if (timeframe === '12months') {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const bins: { label: string; monthIndex: number; year: number; revenue: number; orders: number }[] = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        bins.push({
          label: months[d.getMonth()],
          monthIndex: d.getMonth(),
          year: d.getFullYear(),
          revenue: 0,
          orders: 0,
        });
      }

      ordersForChart.forEach((order) => {
        const orderMonth = order.createdAt.getMonth();
        const orderYear = order.createdAt.getFullYear();
        const matchedBin = bins.find((b) => b.monthIndex === orderMonth && b.year === orderYear);
        if (matchedBin) {
          matchedBin.revenue += order.total;
          matchedBin.orders += 1;
        }
      });

      salesTrend = bins.map((b) => ({ label: b.label, revenue: Math.round(b.revenue), orders: b.orders }));
    } else { // 7days
      const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const bins: { label: string; dateStr: string; revenue: number; orders: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        bins.push({
          label: weekdays[d.getDay()],
          dateStr: d.toDateString(),
          revenue: 0,
          orders: 0,
        });
      }

      ordersForChart.forEach((order) => {
        const orderDateStr = order.createdAt.toDateString();
        const matchedBin = bins.find((b) => b.dateStr === orderDateStr);
        if (matchedBin) {
          matchedBin.revenue += order.total;
          matchedBin.orders += 1;
        }
      });

      salesTrend = bins.map((b) => ({ label: b.label, revenue: Math.round(b.revenue), orders: b.orders }));
    }

    // 6. Category Sales (aggregates order items)
    const orderItems = await this.prisma.orderItem.findMany({
      where: {
        restaurantId,
        createdAt: { gte: startDate },
        order: { status: { not: 'CANCELLED' } },
      },
      include: {
        menuItem: {
          include: {
            category: true,
          },
        },
      },
    });

    const categoriesMap = new Map<string, { value: number; count: number }>();
    orderItems.forEach((item) => {
      const categoryName = item.menuItem?.category?.name || 'Uncategorized';
      const existing = categoriesMap.get(categoryName) || { value: 0, count: 0 };
      categoriesMap.set(categoryName, {
        value: existing.value + item.price * item.quantity,
        count: existing.count + item.quantity,
      });
    });

    const categoryColors = ["#F94144", "#F3722C", "#F8961E", "#F9844A", "#F9C74F", "#90BE6D", "#43AA8B", "#4D908E", "#577590", "#277DA1"];
    const categorySales = Array.from(categoriesMap.entries()).map(([name, data], idx) => ({
      name,
      value: Math.round(data.value),
      count: data.count,
      color: categoryColors[idx % categoryColors.length],
    }));

    // 7. Busy Hours
    const busyBins = [
      { hour: "8 AM", hr: 8, orders: 0, revenue: 0 },
      { hour: "10 AM", hr: 10, orders: 0, revenue: 0 },
      { hour: "12 PM", hr: 12, orders: 0, revenue: 0 },
      { hour: "2 PM", hr: 14, orders: 0, revenue: 0 },
      { hour: "4 PM", hr: 16, orders: 0, revenue: 0 },
      { hour: "6 PM", hr: 18, orders: 0, revenue: 0 },
      { hour: "8 PM", hr: 20, orders: 0, revenue: 0 },
      { hour: "10 PM", hr: 22, orders: 0, revenue: 0 },
    ];

    ordersForChart.forEach((order) => {
      const orderHour = order.createdAt.getHours();
      let minDiff = 24;
      let bestBinIdx = 0;
      busyBins.forEach((bin, idx) => {
        const diff = Math.abs(orderHour - bin.hr);
        if (diff < minDiff) {
          minDiff = diff;
          bestBinIdx = idx;
        }
      });
      busyBins[bestBinIdx].orders += 1;
      busyBins[bestBinIdx].revenue += order.total;
    });

    const busyHours = busyBins.map(b => ({
      hour: b.hour,
      orders: b.orders,
      revenue: Math.round(b.revenue),
    }));

    // 8. Order Channels
    const deliveryOrdersCount = await this.prisma.order.count({
      where: { restaurantId, orderType: 'DELIVERY', createdAt: { gte: startDate } }
    });
    const pickupOrdersCount = await this.prisma.order.count({
      where: { restaurantId, orderType: 'SELF_PICKUP', createdAt: { gte: startDate } }
    });
    const totalChannels = deliveryOrdersCount + pickupOrdersCount;
    const deliveryPercent = totalChannels > 0 ? Math.round((deliveryOrdersCount / totalChannels) * 100) : 0;
    const pickupPercent = totalChannels > 0 ? Math.max(0, 100 - deliveryPercent) : 0;

    const orderChannels = [
      { name: "Delivery", value: deliveryPercent, color: "#71A066" },
      { name: "Pickup", value: pickupPercent, color: "#F9A03F" },
    ];

    // 9. Payment Methods
    const cashOrdersCount = await this.prisma.order.count({
      where: { restaurantId, paymentMethod: 'CASH', createdAt: { gte: startDate } }
    });
    const cardOrdersCount = await this.prisma.order.count({
      where: { restaurantId, paymentMethod: 'CARD', createdAt: { gte: startDate } }
    });
    const totalPayments = cashOrdersCount + cardOrdersCount;
    const cashPercent = totalPayments > 0 ? Math.round((cashOrdersCount / totalPayments) * 100) : 0;
    const cardPercent = totalPayments > 0 ? Math.max(0, 100 - cashPercent) : 0;

    const paymentMethods = [
      { name: "Cash", value: cashPercent, color: "#813405" },
      { name: "Card", value: cardPercent, color: "#71A066" },
    ];

    // 10. Customer Retention
    const uniqueUserIds = await this.prisma.order.groupBy({
      by: ['userId'],
      where: { restaurantId, createdAt: { gte: startDate } }
    });

    let returningCount = 0;
    let newCount = 0;

    for (const userGrp of uniqueUserIds) {
      const priorOrdersCount = await this.prisma.order.count({
        where: {
          restaurantId,
          userId: userGrp.userId,
          createdAt: { lt: startDate }
        }
      });
      if (priorOrdersCount > 0) {
        returningCount++;
      } else {
        newCount++;
      }
    }

    const totalRetention = returningCount + newCount;
    const returningPercent = totalRetention > 0 ? Math.round((returningCount / totalRetention) * 100) : 0;
    const newPercent = totalRetention > 0 ? Math.max(0, 100 - returningPercent) : 0;

    const customerRetention = [
      { name: "Returning", value: returningPercent, color: "#71A066" },
      { name: "New", value: newPercent, color: "#F9C74F" },
    ];

    // 11. Top Selling Menu Items
    const popularItemsDb = await this.prisma.orderItem.groupBy({
      by: ['menuItemId'],
      where: {
        restaurantId,
        createdAt: { gte: startDate },
        order: { status: { not: 'CANCELLED' } },
      },
      _sum: {
        quantity: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: 5,
    });

    let topSellingItems: any[] = [];
    if (popularItemsDb.length > 0) {
      const itemIds = popularItemsDb.map((d) => d.menuItemId);
      const menuItems = await this.prisma.menuItem.findMany({
        where: { id: { in: itemIds } },
        include: { category: true }
      });
      
      topSellingItems = await Promise.all(popularItemsDb.map(async (item) => {
        const menuItem = menuItems.find((m) => m.id === item.menuItemId);
        const quantity = item._sum.quantity || 0;
        const price = menuItem?.price || 0;

        const reviewStats = await this.prisma.review.aggregate({
          where: {
            restaurantId,
            dishName: menuItem?.name,
          },
          _avg: {
            rating: true,
          },
        });
        const rating = reviewStats._avg.rating ? Number(reviewStats._avg.rating.toFixed(1)) : (restaurant.rating || 5.0);

        return {
          id: item.menuItemId,
          name: menuItem?.name || 'Unknown Item',
          category: menuItem?.category?.name || 'General',
          price: price,
          salesCount: quantity,
          revenue: quantity * price,
          rating,
          image: menuItem?.image || null
        };
      }));
      topSellingItems.sort((a, b) => b.salesCount - a.salesCount);
    } else {
      const topMenuItems = await this.prisma.menuItem.findMany({
        where: { restaurantId },
        include: { category: true },
        orderBy: { ordersCount: 'desc' },
        take: 5,
      });
      topSellingItems = await Promise.all(topMenuItems.map(async (item) => {
        const reviewStats = await this.prisma.review.aggregate({
          where: {
            restaurantId,
            dishName: item.name,
          },
          _avg: {
            rating: true,
          },
        });
        const rating = reviewStats._avg.rating ? Number(reviewStats._avg.rating.toFixed(1)) : (restaurant.rating || 5.0);

        return {
          id: item.id,
          name: item.name,
          category: item?.category?.name || 'General',
          price: item.price,
          salesCount: item.ordersCount,
          revenue: item.ordersCount * item.price,
          rating,
          image: item.image,
        };
      }));
    }

    return {
      metrics,
      salesTrend,
      categorySales,
      busyHours,
      orderChannels,
      paymentMethods,
      customerRetention,
      topSellingItems,
    };
  }

  async getCustomers(userId: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { userId },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant profile not found for this user');
    }

    const restaurantId = restaurant.id;

    // Temporary Debug code
    try {
      const allRestaurants = await this.prisma.restaurant.findMany({ select: { id: true, name: true, userId: true } });
      const allOrders = await this.prisma.order.findMany({ select: { id: true, orderNumber: true, restaurantId: true, restaurantName: true, userId: true } });
      fs.writeFileSync('j:\\A-Intern\\Trinco_Bites\\backend-debug.json', JSON.stringify({
        passedUserId: userId,
        foundRestaurant: restaurant,
        allRestaurants,
        allOrdersCount: allOrders.length,
        allOrders
      }, null, 2));
    } catch (e) {
      try {
        fs.writeFileSync('j:\\A-Intern\\Trinco_Bites\\backend-debug.json', JSON.stringify({ error: e.message }, null, 2));
      } catch (err) {}
    }

    // Fetch all orders for this restaurant to identify unique customers and compute spent/order count
    const orders = await this.prisma.order.findMany({
      where: { restaurantId },
      include: {
        items: true,
        user: {
          include: {
            reviews: {
              where: { restaurantId }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const customerMap = new Map<string, any>();

    orders.forEach((order) => {
      const user = order.user;
      if (!user) return;

      if (!customerMap.has(user.id)) {
        customerMap.set(user.id, {
          id: user.id,
          name: user.fullName || 'Guest',
          email: user.email,
          phone: user.phone || 'N/A',
          joinDate: order.createdAt,
          totalOrders: 0,
          totalSpent: 0,
          orders: [],
          reviews: user.reviews,
          itemQuantities: {} as Record<string, number>
        });
      }

      const cust = customerMap.get(user.id);
      cust.totalOrders += 1;
      if (order.status !== 'CANCELLED') {
        cust.totalSpent += order.total;
      }

      if (order.createdAt < cust.joinDate) {
        cust.joinDate = order.createdAt;
      }

      order.items.forEach((item) => {
        cust.itemQuantities[item.name] = (cust.itemQuantities[item.name] || 0) + item.quantity;
      });

      let orderStatus = 'Pending';
      if (order.status === 'DELIVERED') orderStatus = 'Completed';
      else if (order.status === 'CANCELLED') orderStatus = 'Cancelled';
      else if (order.status === 'PREPARING') orderStatus = 'Pending';

      cust.orders.push({
        id: order.orderNumber,
        date: order.createdAt.toISOString().split('T')[0],
        items: order.items.map((i) => `${i.quantity}x ${i.name}`).join(' + '),
        amount: order.total,
        paymentStatus: order.paymentStatus === 'COMPLETED' ? 'Paid' : order.paymentStatus === 'FAILED' ? 'Failed' : 'Pending',
        orderStatus
      });
    });

    const customersList = Array.from(customerMap.values()).map((cust) => {
      let favoriteFood = 'N/A';
      let maxQty = 0;
      Object.entries(cust.itemQuantities as Record<string, number>).forEach(([name, qty]) => {
        if (qty > maxQty) {
          maxQty = qty;
          favoriteFood = name;
        }
      });

      let loyaltyLevel: string | undefined = undefined;
      let status = 'Active';
      if (cust.totalOrders >= 20) {
        loyaltyLevel = 'Diamond';
        status = 'Frequent';
      } else if (cust.totalOrders >= 10) {
        loyaltyLevel = 'Platinum';
        status = 'Frequent';
      } else if (cust.totalOrders >= 5) {
        loyaltyLevel = 'Gold';
        status = 'Frequent';
      }

      const validReviews = cust.reviews.filter((r: any) => r.rating > 0);
      const avgRating = validReviews.length
        ? Number((validReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / validReviews.length).toFixed(1))
        : 5.0;

      return {
        id: cust.id,
        name: cust.name,
        email: cust.email,
        phone: cust.phone,
        avatar: cust.name
          .split(' ')
          .map((n: string) => n[0])
          .join('')
          .toUpperCase()
          .substring(0, 2),
        totalOrders: cust.totalOrders,
        totalSpent: cust.totalSpent,
        joinDate: cust.joinDate.toISOString().split('T')[0],
        status,
        loyaltyLevel,
        favoriteFood,
        rating: avgRating,
        orders: cust.orders,
        reviews: cust.reviews.map((r: any) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          date: r.createdAt.toISOString().split('T')[0],
          foodRating: r.foodRating || r.rating,
          serviceRating: r.serviceRating || r.rating
        }))
      };
    });

    // --- Growth Chart (Last 7 Days) ---
    const growthData: any[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const targetDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
      const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);

      const dayOrders = await this.prisma.order.findMany({
        where: {
          restaurantId,
          createdAt: { gte: startOfDay, lte: endOfDay }
        },
        select: { userId: true }
      });

      const uniqueDayUsers = Array.from(new Set(dayOrders.map((o) => o.userId)));

      let newUsersCount = 0;
      for (const targetUserId of uniqueDayUsers) {
        const priorOrdersCount = await this.prisma.order.count({
          where: {
            restaurantId,
            userId: targetUserId,
            createdAt: { lt: startOfDay }
          }
        });
        if (priorOrdersCount === 0) {
          newUsersCount++;
        }
      }

      const month = targetDate.toLocaleDateString('en-US', { month: 'short' });
      const day = targetDate.getDate();

      growthData.push({
        date: `${month} ${day}`,
        customers: uniqueDayUsers.length,
        active: newUsersCount
      });
    }

    // --- Returning Diners Retention ---
    const totalCustomers = customersList.length;
    const returningDiners = totalCustomers > 0
      ? Math.round((customersList.filter((c) => c.totalOrders > 1).length / totalCustomers) * 100)
      : 0;

    return {
      customers: customersList,
      growthData,
      returningDiners
    };
  }

  private prepareData(dto: any) {
    const data: any = { ...dto };
    delete data.tags;
    delete data.postalCode;
    delete data.whatsapp;
    delete data.dineIn;
    delete data.autoAcceptOrders;
    delete data.featuredRestaurant;

    // Helper to safely parse float
    const safeFloat = (val: any) => {
      if (val === undefined || val === null || val === '') return null;
      const parsed = parseFloat(val);
      return isNaN(parsed) ? null : parsed;
    };

    // Helper to safely parse int
    const safeInt = (val: any) => {
      if (val === undefined || val === null || val === '') return null;
      const parsed = parseInt(val, 10);
      return isNaN(parsed) ? null : parsed;
    };

    if (dto.latitude !== undefined) data.latitude = safeFloat(dto.latitude);
    if (dto.longitude !== undefined) data.longitude = safeFloat(dto.longitude);
    if (dto.deliveryRadius !== undefined) data.deliveryRadius = safeFloat(dto.deliveryRadius);
    if (dto.deliveryFee !== undefined) data.deliveryFee = safeFloat(dto.deliveryFee);
    if (dto.minOrder !== undefined) data.minOrder = safeFloat(dto.minOrder);
    if (dto.freeDeliveryThreshold !== undefined) data.freeDeliveryThreshold = safeFloat(dto.freeDeliveryThreshold);
    if (dto.rating !== undefined) data.rating = safeFloat(dto.rating);
    if (dto.reviewsCount !== undefined) data.reviewsCount = safeInt(dto.reviewsCount);

    // Map and filter cuisineTypes
    if (dto.cuisineTypes && Array.isArray(dto.cuisineTypes)) {
      const validCuisines = new Set([
        'SRILANKAN', 'SEAFOOD', 'KOTTU', 'BIRYANI', 'BURGERS',
        'PIZZA', 'CHINESE', 'DESSERTS', 'SOUTH_INDIAN', 'JUICES'
      ]);
      const mappedCuisines = dto.cuisineTypes
        .map((c: string) => {
          const upper = c.toUpperCase().replace(/\s+/g, '_');
          if (upper === 'RICE_AND_CURRY' || upper === 'SRILANKAN_FOODS') return 'SRILANKAN';
          if (upper === 'JUICE') return 'JUICES';
          return upper;
        })
        .filter((c: string) => validCuisines.has(c));
      data.cuisineTypes = Array.from(new Set(mappedCuisines));
    }

    // Automatically set openingTime and closingTime from weeklyHours if they are empty/null
    if ((!data.openingTime || data.openingTime === '') && dto.weeklyHours) {
      let weekly: any = dto.weeklyHours;
      if (typeof weekly === 'string') {
        try {
          weekly = JSON.parse(weekly);
        } catch (e) {
          weekly = null;
        }
      }
      if (weekly && typeof weekly === 'object') {
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        let openDayData: any = null;
        for (const day of days) {
          if (weekly[day]?.open && weekly[day]?.from && weekly[day]?.to) {
            openDayData = weekly[day];
            break;
          }
        }
        if (openDayData) {
          data.openingTime = openDayData.from;
          data.closingTime = openDayData.to;
        } else {
          const firstDay = Object.keys(weekly)[0];
          if (firstDay && weekly[firstDay]?.from && weekly[firstDay]?.to) {
            data.openingTime = weekly[firstDay].from;
            data.closingTime = weekly[firstDay].to;
          }
        }
      }
    } else if ((!data.closingTime || data.closingTime === '') && dto.weeklyHours) {
      // Just in case only closingTime is empty
      let weekly: any = dto.weeklyHours;
      if (typeof weekly === 'string') {
        try {
          weekly = JSON.parse(weekly);
        } catch (e) {
          weekly = null;
        }
      }
      if (weekly && typeof weekly === 'object') {
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        let openDayData: any = null;
        for (const day of days) {
          if (weekly[day]?.open && weekly[day]?.from && weekly[day]?.to) {
            openDayData = weekly[day];
            break;
          }
        }
        if (openDayData) {
          data.closingTime = openDayData.to;
        }
      }
    }

    return data;
  }

  async getDbDebug() {
    const restaurants = await this.prisma.restaurant.findMany({ select: { id: true, name: true, userId: true } });
    const orders = await this.prisma.order.findMany({ select: { id: true, orderNumber: true, restaurantId: true, restaurantName: true, userId: true } });
    const users = await this.prisma.user.findMany({ select: { id: true, email: true, role: true } });
    return {
      restaurants,
      orders,
      users
    };
  }
}
