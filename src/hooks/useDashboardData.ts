import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface OrderWithFulfillment {
  id: string;
  order_number: string;
  customer_name: string;
  delivery_date: string;
  order_date: string;
  fulfillment_percentage: number;
  windows_count: number;
  doors_count: number;
  sliding_doors_count: number;
  has_sliding_doors: boolean;
  has_plisse_screens: boolean;
  has_nailing_flanges: boolean;
  screen_type: string | null;
  delivery_complete: boolean;
  production_status: string;
  hold_started_at: string | null;
  // Component status
  reinforcement_status: string | null;
  windows_profile_status: string | null;
  glass_status: string | null;
  screens_status: string | null;
  plisse_screens_status: string | null;
  nail_fins_status: string | null;
  hardware_status: string | null;
  // Fulfillment data
  fulfillment?: {
    reinforcement_cutting: string | null;
    profile_cutting: string | null;
    welding_status: string | null;
    doors_status: string | null;
    sliding_doors_status: string | null;
    assembly_status: string | null;
    glass_status: string | null;
    glass_installed: boolean | null;
    doors_glass_installed: boolean | null;
    sliding_doors_glass_installed: boolean | null;
    screens_cutting: string | null;
    // Delivery fields
    windows_delivered: boolean | null;
    doors_delivered: boolean | null;
    sliding_doors_delivered: boolean | null;
    screens_delivered_final: boolean | null;
    handles_delivered: boolean | null;
    glass_delivered_final: boolean | null;
    nailing_fins_delivered: boolean | null;
    brackets_delivered: boolean | null;
  } | null;
}

export interface PriorityOrder extends OrderWithFulfillment {
  priorityScore: number;
  healthStatus: 'on-track' | 'at-risk' | 'critical' | 'blocked';
  daysUntilDelivery: number;
  blockers: string[];
  nextAction: string;
  componentReadiness: number;
  manufacturingProgress: number;
  deliveryProgress: {
    deliveredCount: number;
    totalItems: number;
    pendingItems: string[];
  };
}

export interface ComponentSummary {
  name: string;
  field: string;
  notOrdered: number;
  ordered: number;
  available: number;
  affectedOrders: { id: string; order_number: string }[];
}

export interface ManufacturingWorkload {
  stage: string;
  notStarted: number;
  partial: number;
  complete: number;
}

export interface DashboardMetrics {
  totalActive: number;
  criticalCount: number;
  atRiskCount: number;
  blockedCount: number;
  pendingComponents: number;
  avgDaysToDelivery: number;
  readyToShip: number;
  pendingDeliveries: number;
  onHoldCount: number;
  productionReadyCount: number;
}

const COMPONENT_FIELDS = [
  { name: 'Reinforcement', field: 'reinforcement_status' },
  { name: 'Windows Profile', field: 'windows_profile_status' },
  { name: 'Glass', field: 'glass_status' },
  { name: 'Screens', field: 'screens_status' },
  { name: 'Plisse Screens', field: 'plisse_screens_status' },
  { name: 'Nail Fins', field: 'nail_fins_status' },
  { name: 'Hardware', field: 'hardware_status' },
] as const;

// Helper to check if a component is applicable to an order
const isComponentApplicable = (order: OrderWithFulfillment, field: string): boolean => {
  if (field === 'screens_status') return !!order.screen_type;
  if (field === 'plisse_screens_status') return !!order.has_plisse_screens;
  if (field === 'nail_fins_status') return !!order.has_nailing_flanges;
  return true;
};

const MANUFACTURING_STAGES = [
  { name: 'Reinforcement Cutting', field: 'reinforcement_cutting' },
  { name: 'Profile Cutting', field: 'profile_cutting' },
  { name: 'Welding', field: 'welding_status' },
  { name: 'Doors Assembly', field: 'doors_status' },
  { name: 'Sliding Doors', field: 'sliding_doors_status' },
  { name: 'Windows Assembly', field: 'assembly_status' },
  { name: 'Glass', field: 'glass_status' },
  { name: 'Screens', field: 'screens_cutting' },
] as const;

const getDaysUntilDelivery = (deliveryDate: string) => {
  const delivery = new Date(deliveryDate);
  const now = new Date();
  return Math.ceil((delivery.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};

const getComponentStatus = (order: OrderWithFulfillment, field: string): string => {
  const fieldMap: Record<string, keyof OrderWithFulfillment> = {
    reinforcement_status: 'reinforcement_status',
    windows_profile_status: 'windows_profile_status',
    glass_status: 'glass_status',
    screens_status: 'screens_status',
    plisse_screens_status: 'plisse_screens_status',
    nail_fins_status: 'nail_fins_status',
    hardware_status: 'hardware_status',
  };
  const key = fieldMap[field];
  return key ? (order[key] as string || 'not_ordered') : 'not_ordered';
};

type FulfillmentFields = NonNullable<OrderWithFulfillment['fulfillment']>;

const getManufacturingStatus = (order: OrderWithFulfillment, field: string): string => {
  if (!order.fulfillment) return 'not_started';
  const f = order.fulfillment;
  const fieldMap: Record<string, keyof FulfillmentFields> = {
    reinforcement_cutting: 'reinforcement_cutting',
    profile_cutting: 'profile_cutting',
    welding_status: 'welding_status',
    doors_status: 'doors_status',
    sliding_doors_status: 'sliding_doors_status',
    assembly_status: 'assembly_status',
    glass_status: 'glass_status',
    screens_cutting: 'screens_cutting',
  };
  const key = fieldMap[field];
  return key ? (f[key] as string || 'not_started') : 'not_started';
};

const calculateComponentReadiness = (order: OrderWithFulfillment): number => {
  let available = 0;
  let applicable = 0;
  COMPONENT_FIELDS.forEach(({ field }) => {
    if (!isComponentApplicable(order, field)) return;
    applicable++;
    if (getComponentStatus(order, field) === 'available') available++;
  });
  return applicable > 0 ? Math.round((available / applicable) * 100) : 100;
};

const calculateManufacturingProgress = (order: OrderWithFulfillment): number => {
  if (!order.fulfillment) return 0;
  let points = 0;
  let total = 0;
  
  MANUFACTURING_STAGES.forEach(({ field }) => {
    // Skip doors if no doors
    if (field === 'doors_status' && !order.doors_count) return;
    // Skip sliding doors if no sliding doors
    if (field === 'sliding_doors_status' && !order.sliding_doors_count) return;
    
    total += 1;
    const status = getManufacturingStatus(order, field);
    if (status === 'complete') points += 1;
    else if (status === 'partial') points += 0.5;
  });
  
  return total > 0 ? Math.round((points / total) * 100) : 0;
};

const getBlockers = (order: OrderWithFulfillment): string[] => {
  const blockers: string[] = [];
  
  // Check for components not ordered (only applicable ones)
  COMPONENT_FIELDS.forEach(({ name, field }) => {
    if (!isComponentApplicable(order, field)) return;
    const status = getComponentStatus(order, field);
    if (status === 'not_ordered') {
      blockers.push(`${name} not ordered`);
    }
  });
  
  // Check for components ordered but not available (only applicable ones)
  COMPONENT_FIELDS.forEach(({ name, field }) => {
    if (!isComponentApplicable(order, field)) return;
    const status = getComponentStatus(order, field);
    if (status === 'ordered') {
      blockers.push(`Waiting for ${name}`);
    }
  });
  
  return blockers;
};

const DELIVERY_ITEMS = [
  { key: 'windows_delivered', label: 'Windows' },
  { key: 'doors_delivered', label: 'Doors' },
  { key: 'sliding_doors_delivered', label: 'Sliding Doors' },
  { key: 'glass_delivered_final', label: 'Glass' },
  { key: 'screens_delivered_final', label: 'Screens' },
  { key: 'handles_delivered', label: 'Handles' },
  { key: 'nailing_fins_delivered', label: 'Nailing Fins' },
  { key: 'brackets_delivered', label: 'Brackets' },
] as const;

const calculateDeliveryProgress = (order: OrderWithFulfillment): { deliveredCount: number; totalItems: number; pendingItems: string[] } => {
  if (!order.fulfillment) return { deliveredCount: 0, totalItems: 8, pendingItems: [] };
  
  const applicableItems = DELIVERY_ITEMS.filter(item => {
    if (item.key === 'sliding_doors_delivered' && !order.has_sliding_doors) return false;
    if (item.key === 'screens_delivered_final' && !order.screen_type) return false;
    return true;
  });

  const pendingItems: string[] = [];
  let deliveredCount = 0;
  
  applicableItems.forEach(item => {
    const f = order.fulfillment as any;
    if (f?.[item.key] === true) {
      deliveredCount++;
    } else {
      pendingItems.push(item.label);
    }
  });

  return { 
    deliveredCount, 
    totalItems: applicableItems.length, 
    pendingItems 
  };
};

const getNextAction = (order: OrderWithFulfillment): string => {
  // Priority: order components first (only applicable ones)
  for (const { name, field } of COMPONENT_FIELDS) {
    if (!isComponentApplicable(order, field)) continue;
    if (getComponentStatus(order, field) === 'not_ordered') {
      return `Order ${name}`;
    }
  }
  
  // Then check for waiting components (only applicable ones)
  for (const { name, field } of COMPONENT_FIELDS) {
    if (!isComponentApplicable(order, field)) continue;
    if (getComponentStatus(order, field) === 'ordered') {
      return `Follow up on ${name}`;
    }
  }
  
  // Then manufacturing stages
  if (order.fulfillment) {
    for (const { name, field } of MANUFACTURING_STAGES) {
      if (field === 'doors_status' && !order.doors_count) continue;
      if (field === 'sliding_doors_status' && !order.sliding_doors_count) continue;
      
      const status = getManufacturingStatus(order, field);
      if (status === 'not_started') {
        return `Start ${name}`;
      } else if (status === 'partial') {
        return `Complete ${name}`;
      }
    }
  }
  
  return 'Review order';
};

const calculatePriorityScore = (order: OrderWithFulfillment): number => {
  const daysUntil = getDaysUntilDelivery(order.delivery_date);
  const componentReadiness = calculateComponentReadiness(order);
  const manufacturingProgress = calculateManufacturingProgress(order);
  
  // Time urgency (0-40 points) - higher score for closer deadlines
  let timeScore = 0;
  if (daysUntil <= 0) timeScore = 40; // Overdue
  else if (daysUntil <= 3) timeScore = 35;
  else if (daysUntil <= 7) timeScore = 30;
  else if (daysUntil <= 14) timeScore = 20;
  else if (daysUntil <= 21) timeScore = 10;
  else timeScore = 5;
  
  // Completion gap (0-30 points) - higher for less complete orders
  const completionGap = 100 - manufacturingProgress;
  const completionScore = (completionGap / 100) * 30;
  
  // Component readiness (0-20 points) - higher for orders missing components
  const componentGap = 100 - componentReadiness;
  const componentScore = (componentGap / 100) * 20;
  
  // Order complexity (0-10 points) - based on unit count
  const totalUnits = (order.windows_count || 0) + (order.doors_count || 0) + (order.sliding_doors_count || 0);
  const complexityScore = Math.min(totalUnits / 10, 1) * 10;
  
  return Math.round(timeScore + completionScore + componentScore + complexityScore);
};

const getHealthStatus = (order: OrderWithFulfillment): 'on-track' | 'at-risk' | 'critical' | 'blocked' => {
  const daysUntil = getDaysUntilDelivery(order.delivery_date);
  const componentReadiness = calculateComponentReadiness(order);
  const manufacturingProgress = calculateManufacturingProgress(order);
  
  // Blocked if missing components and no manufacturing progress
  if (componentReadiness < 100 && manufacturingProgress < 20) {
    return 'blocked';
  }
  
  // Critical if overdue or due very soon with low progress
  if (daysUntil <= 0 || (daysUntil <= 3 && manufacturingProgress < 80)) {
    return 'critical';
  }
  
  // At-risk if due soon with moderate progress
  if (daysUntil <= 7 && manufacturingProgress < 60) {
    return 'at-risk';
  }
  
  // At-risk if components not ready
  if (componentReadiness < 50) {
    return 'at-risk';
  }
  
  return 'on-track';
};

export function useDashboardData() {
  const [orders, setOrders] = useState<PriorityOrder[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalActive: 0,
    criticalCount: 0,
    atRiskCount: 0,
    blockedCount: 0,
    pendingComponents: 0,
    avgDaysToDelivery: 0,
    readyToShip: 0,
    pendingDeliveries: 0,
    onHoldCount: 0,
    productionReadyCount: 0,
  });
  const [componentSummary, setComponentSummary] = useState<ComponentSummary[]>([]);
  const [manufacturingWorkload, setManufacturingWorkload] = useState<ManufacturingWorkload[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch orders with fulfillment data
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          fulfillment:order_fulfillment(*)
        `)
        .order('delivery_date', { ascending: true });

      if (ordersError) throw ordersError;

      // Process orders
      const processedOrders: PriorityOrder[] = (ordersData || [])
        .filter(order => (order.fulfillment_percentage || 0) < 100 && !order.delivery_complete)
        .map(order => {
          const orderWithFulfillment: OrderWithFulfillment = {
            id: order.id,
            order_number: order.order_number,
            customer_name: order.customer_name,
            delivery_date: order.delivery_date,
            order_date: order.order_date,
            fulfillment_percentage: order.fulfillment_percentage || 0,
            windows_count: order.windows_count || 0,
            doors_count: order.doors_count || 0,
            sliding_doors_count: order.sliding_doors_count || 0,
            has_sliding_doors: order.has_sliding_doors || false,
            has_plisse_screens: order.has_plisse_screens || false,
            has_nailing_flanges: order.has_nailing_flanges || false,
            screen_type: order.screen_type,
            delivery_complete: order.delivery_complete || false,
            production_status: order.production_status || 'hold',
            hold_started_at: order.hold_started_at,
            reinforcement_status: order.reinforcement_status,
            windows_profile_status: order.windows_profile_status,
            glass_status: order.glass_status,
            screens_status: order.screens_status,
            plisse_screens_status: order.plisse_screens_status,
            nail_fins_status: order.nail_fins_status,
            hardware_status: order.hardware_status,
            fulfillment: order.fulfillment?.[0] || null,
          };

          const daysUntilDelivery = getDaysUntilDelivery(order.delivery_date);
          const componentReadiness = calculateComponentReadiness(orderWithFulfillment);
          const manufacturingProgress = calculateManufacturingProgress(orderWithFulfillment);
          const deliveryProgress = calculateDeliveryProgress(orderWithFulfillment);

          return {
            ...orderWithFulfillment,
            priorityScore: calculatePriorityScore(orderWithFulfillment),
            healthStatus: getHealthStatus(orderWithFulfillment),
            daysUntilDelivery,
            blockers: getBlockers(orderWithFulfillment),
            nextAction: getNextAction(orderWithFulfillment),
            componentReadiness,
            manufacturingProgress,
            deliveryProgress,
          };
        })
        .sort((a, b) => b.priorityScore - a.priorityScore);

      setOrders(processedOrders);

      // Calculate metrics
      const critical = processedOrders.filter(o => o.healthStatus === 'critical').length;
      const atRisk = processedOrders.filter(o => o.healthStatus === 'at-risk').length;
      const blocked = processedOrders.filter(o => o.healthStatus === 'blocked').length;
      const readyToShip = processedOrders.filter(o => o.manufacturingProgress >= 90).length;
      
      let pendingComponents = 0;
      processedOrders.forEach(order => {
        COMPONENT_FIELDS.forEach(({ field }) => {
          if (!isComponentApplicable(order, field)) return;
          const status = getComponentStatus(order, field);
          if (status !== 'available') pendingComponents++;
        });
      });

      const avgDays = processedOrders.length > 0
        ? Math.round(processedOrders.reduce((sum, o) => sum + o.daysUntilDelivery, 0) / processedOrders.length)
        : 0;

      // Calculate pending deliveries (orders with 90%+ manufacturing but not all delivered)
      const pendingDeliveries = processedOrders.filter(o => 
        o.manufacturingProgress >= 90 && o.deliveryProgress.deliveredCount < o.deliveryProgress.totalItems
      ).length;

      // Calculate production status counts
      const onHoldCount = processedOrders.filter(o => o.production_status === 'hold').length;
      const productionReadyCount = processedOrders.filter(o => o.production_status === 'production_ready').length;

      setMetrics({
        totalActive: processedOrders.length,
        criticalCount: critical,
        atRiskCount: atRisk,
        blockedCount: blocked,
        pendingComponents,
        avgDaysToDelivery: avgDays,
        readyToShip,
        pendingDeliveries,
        onHoldCount,
        productionReadyCount,
      });

      // Calculate component summary - only include components that at least one order uses
      const summary: ComponentSummary[] = COMPONENT_FIELDS.map(({ name, field }) => {
        const result: ComponentSummary = {
          name,
          field,
          notOrdered: 0,
          ordered: 0,
          available: 0,
          affectedOrders: [],
        };

        processedOrders.forEach(order => {
          // Skip components not applicable to this order
          if (!isComponentApplicable(order, field)) return;
          
          const status = getComponentStatus(order, field);
          if (status === 'not_ordered') {
            result.notOrdered++;
            result.affectedOrders.push({ id: order.id, order_number: order.order_number });
          } else if (status === 'ordered') {
            result.ordered++;
            result.affectedOrders.push({ id: order.id, order_number: order.order_number });
          } else {
            result.available++;
          }
        });

        return result;
      }).filter(component => {
        // Only include components that have at least one applicable order
        const totalApplicable = component.notOrdered + component.ordered + component.available;
        return totalApplicable > 0;
      });

      setComponentSummary(summary);

      // Calculate manufacturing workload
      const workload: ManufacturingWorkload[] = MANUFACTURING_STAGES.map(({ name, field }) => {
        const result: ManufacturingWorkload = {
          stage: name,
          notStarted: 0,
          partial: 0,
          complete: 0,
        };

        processedOrders.forEach(order => {
          // Skip if order doesn't have this stage
          if (field === 'doors_status' && !order.doors_count) return;
          if (field === 'sliding_doors_status' && !order.sliding_doors_count) return;

          const status = getManufacturingStatus(order, field);
          if (status === 'complete') result.complete++;
          else if (status === 'partial') result.partial++;
          else result.notStarted++;
        });

        return result;
      });

      setManufacturingWorkload(workload);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    orders,
    metrics,
    componentSummary,
    manufacturingWorkload,
    loading,
    refetch: fetchData,
  };
}
