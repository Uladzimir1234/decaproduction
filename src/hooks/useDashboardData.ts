import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ConstructionComponent {
  id: string;
  component_type: string;
  component_name: string | null;
  quantity: number;
  status: string;
}

interface DeliveryBatch {
  id: string;
  status: string;
  delivery_date: string;
}

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
  // Sliding doors component status
  sliding_doors_profile_status: string | null;
  sliding_doors_hardware_status: string | null;
  // File-extracted components
  fileComponents?: ConstructionComponent[];
  // Delivery batches
  deliveryBatches?: DeliveryBatch[];
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
    // Sliding doors independent track
    sliding_doors_reinforcement_cutting: string | null;
    sliding_doors_profile_cutting: string | null;
    sliding_doors_welding_status: string | null;
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
    // Batch-based delivery
    batchesPreparing: number;
    batchesShipped: number;
    batchesDelivered: number;
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
  // Batch-based delivery metrics
  batchesPreparing: number;
  batchesShipped: number;
}

// Base component fields (always shown)
const BASE_COMPONENT_FIELDS = [
  { name: 'Reinforcement', field: 'reinforcement_status' },
  { name: 'Windows Profile', field: 'windows_profile_status' },
  { name: 'Glass', field: 'glass_status' },
  { name: 'Screens', field: 'screens_status' },
  { name: 'Plisse Screens', field: 'plisse_screens_status' },
  { name: 'Nail Fins', field: 'nail_fins_status' },
  { name: 'Hardware', field: 'hardware_status' },
];

// Sliding doors component fields (only for orders with sliding doors)
const SD_COMPONENT_FIELDS = [
  { name: 'SD Profile', field: 'sliding_doors_profile_status' },
  { name: 'SD Hardware', field: 'sliding_doors_hardware_status' },
];

// Get all applicable component fields for an order
const getComponentFields = (order: OrderWithFulfillment) => {
  const fields = [...BASE_COMPONENT_FIELDS];
  if (order.has_sliding_doors) {
    fields.push(...SD_COMPONENT_FIELDS);
  }
  return fields;
};

// Helper to check if a component is applicable to an order
const isComponentApplicable = (order: OrderWithFulfillment, field: string): boolean => {
  if (field === 'screens_status') return !!order.screen_type;
  if (field === 'plisse_screens_status') return !!order.has_plisse_screens;
  if (field === 'nail_fins_status') return !!order.has_nailing_flanges;
  if (field === 'sliding_doors_profile_status' || field === 'sliding_doors_hardware_status') {
    return !!order.has_sliding_doors;
  }
  return true;
};

// Base manufacturing stages (always shown)
const BASE_MANUFACTURING_STAGES = [
  { name: 'Reinforcement Cutting', field: 'reinforcement_cutting' },
  { name: 'Profile Cutting', field: 'profile_cutting' },
  { name: 'Welding', field: 'welding_status' },
  { name: 'Doors Assembly', field: 'doors_status' },
  { name: 'Windows Assembly', field: 'assembly_status' },
  { name: 'Glass Installed', field: 'glass_status' },
  { name: 'Screens', field: 'screens_cutting' },
];

// Sliding doors manufacturing stages (only for orders with sliding doors)
const SD_MANUFACTURING_STAGES = [
  { name: 'SD Reinforcement', field: 'sliding_doors_reinforcement_cutting' },
  { name: 'SD Profile Cutting', field: 'sliding_doors_profile_cutting' },
  { name: 'SD Welding', field: 'sliding_doors_welding_status' },
  { name: 'SD Assembly', field: 'sliding_doors_status' },
  { name: 'SD Glass Installed', field: 'sliding_doors_glass_installed' },
];

// Get all applicable manufacturing stages for an order
const getManufacturingStages = (order: OrderWithFulfillment) => {
  const stages = [...BASE_MANUFACTURING_STAGES];
  if (order.has_sliding_doors) {
    stages.push(...SD_MANUFACTURING_STAGES);
  }
  return stages;
};

const getDaysUntilDelivery = (deliveryDate: string) => {
  const delivery = new Date(deliveryDate);
  const now = new Date();
  return Math.ceil((delivery.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};

const getComponentStatus = (order: OrderWithFulfillment, field: string): string => {
  // Check file-extracted components first
  if (order.fileComponents && order.fileComponents.length > 0) {
    const typeMap: Record<string, string> = {
      reinforcement_status: 'reinforcement',
      windows_profile_status: 'profile',
      glass_status: 'glass',
      screens_status: 'screens',
      plisse_screens_status: 'plisse',
      nail_fins_status: 'nail_fins',
      hardware_status: 'hardware',
      sliding_doors_profile_status: 'sd_profile',
      sliding_doors_hardware_status: 'sd_hardware',
    };
    const componentType = typeMap[field];
    if (componentType) {
      const matchingComponents = order.fileComponents.filter(c => 
        c.component_type.toLowerCase() === componentType.toLowerCase()
      );
      if (matchingComponents.length > 0) {
        // If any matching component is not_ordered, return not_ordered
        if (matchingComponents.some(c => c.status === 'not_ordered')) return 'not_ordered';
        // If any matching component is ordered, return ordered
        if (matchingComponents.some(c => c.status === 'ordered')) return 'ordered';
        // All are available
        return 'available';
      }
    }
  }
  
  // Fall back to legacy order-level fields
  const fieldMap: Record<string, keyof OrderWithFulfillment> = {
    reinforcement_status: 'reinforcement_status',
    windows_profile_status: 'windows_profile_status',
    glass_status: 'glass_status',
    screens_status: 'screens_status',
    plisse_screens_status: 'plisse_screens_status',
    nail_fins_status: 'nail_fins_status',
    hardware_status: 'hardware_status',
    sliding_doors_profile_status: 'sliding_doors_profile_status',
    sliding_doors_hardware_status: 'sliding_doors_hardware_status',
  };
  const key = fieldMap[field];
  return key ? (order[key] as string || 'not_ordered') : 'not_ordered';
};

type FulfillmentFields = NonNullable<OrderWithFulfillment['fulfillment']>;

const getManufacturingStatus = (order: OrderWithFulfillment, field: string): string => {
  if (!order.fulfillment) return 'not_started';
  const f = order.fulfillment;
  
  // Handle boolean fields specially
  if (field === 'sliding_doors_glass_installed') {
    return f.sliding_doors_glass_installed ? 'complete' : 'not_started';
  }
  
  const fieldMap: Record<string, keyof FulfillmentFields> = {
    reinforcement_cutting: 'reinforcement_cutting',
    profile_cutting: 'profile_cutting',
    welding_status: 'welding_status',
    doors_status: 'doors_status',
    sliding_doors_status: 'sliding_doors_status',
    assembly_status: 'assembly_status',
    glass_status: 'glass_status',
    screens_cutting: 'screens_cutting',
    sliding_doors_reinforcement_cutting: 'sliding_doors_reinforcement_cutting',
    sliding_doors_profile_cutting: 'sliding_doors_profile_cutting',
    sliding_doors_welding_status: 'sliding_doors_welding_status',
  };
  const key = fieldMap[field];
  return key ? (f[key] as string || 'not_started') : 'not_started';
};

const calculateComponentReadiness = (order: OrderWithFulfillment): number => {
  let available = 0;
  let applicable = 0;
  const fields = getComponentFields(order);
  
  fields.forEach(({ field }) => {
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
  
  const stages = getManufacturingStages(order);
  
  stages.forEach(({ field }) => {
    // Skip doors if no doors
    if (field === 'doors_status' && !order.doors_count) return;
    // Skip sliding doors stages if no sliding doors
    if (field.startsWith('sliding_doors') && !order.sliding_doors_count) return;
    
    total += 1;
    const status = getManufacturingStatus(order, field);
    if (status === 'complete') points += 1;
    else if (status === 'partial') points += 0.5;
  });
  
  return total > 0 ? Math.round((points / total) * 100) : 0;
};

const getBlockers = (order: OrderWithFulfillment): string[] => {
  const blockers: string[] = [];
  const fields = getComponentFields(order);
  
  // Check for components not ordered (only applicable ones)
  fields.forEach(({ name, field }) => {
    if (!isComponentApplicable(order, field)) return;
    const status = getComponentStatus(order, field);
    if (status === 'not_ordered') {
      blockers.push(`${name} not ordered`);
    }
  });
  
  // Check for components ordered but not available (only applicable ones)
  fields.forEach(({ name, field }) => {
    if (!isComponentApplicable(order, field)) return;
    const status = getComponentStatus(order, field);
    if (status === 'ordered') {
      blockers.push(`Waiting for ${name}`);
    }
  });
  
  return blockers;
};

const calculateDeliveryProgress = (order: OrderWithFulfillment): { 
  deliveredCount: number; 
  totalItems: number; 
  pendingItems: string[];
  batchesPreparing: number;
  batchesShipped: number;
  batchesDelivered: number;
} => {
  // Use batch-based delivery if available
  if (order.deliveryBatches && order.deliveryBatches.length > 0) {
    const preparing = order.deliveryBatches.filter(b => b.status === 'preparing').length;
    const shipped = order.deliveryBatches.filter(b => b.status === 'shipped').length;
    const delivered = order.deliveryBatches.filter(b => b.status === 'delivered').length;
    const total = order.deliveryBatches.length;
    
    const pendingItems: string[] = [];
    if (preparing > 0) pendingItems.push(`${preparing} batch${preparing > 1 ? 'es' : ''} preparing`);
    if (shipped > 0) pendingItems.push(`${shipped} batch${shipped > 1 ? 'es' : ''} in transit`);
    
    return {
      deliveredCount: delivered,
      totalItems: total,
      pendingItems,
      batchesPreparing: preparing,
      batchesShipped: shipped,
      batchesDelivered: delivered,
    };
  }
  
  // Fall back to legacy delivery tracking
  return { 
    deliveredCount: 0, 
    totalItems: 1, 
    pendingItems: ['No batches created'],
    batchesPreparing: 0,
    batchesShipped: 0,
    batchesDelivered: 0,
  };
};

const getNextAction = (order: OrderWithFulfillment): string => {
  const fields = getComponentFields(order);
  
  // Priority: order components first (only applicable ones)
  for (const { name, field } of fields) {
    if (!isComponentApplicable(order, field)) continue;
    if (getComponentStatus(order, field) === 'not_ordered') {
      return `Order ${name}`;
    }
  }
  
  // Then check for waiting components (only applicable ones)
  for (const { name, field } of fields) {
    if (!isComponentApplicable(order, field)) continue;
    if (getComponentStatus(order, field) === 'ordered') {
      return `Follow up on ${name}`;
    }
  }
  
  // Then manufacturing stages
  if (order.fulfillment) {
    const stages = getManufacturingStages(order);
    for (const { name, field } of stages) {
      if (field === 'doors_status' && !order.doors_count) continue;
      if (field.startsWith('sliding_doors') && !order.sliding_doors_count) continue;
      
      const status = getManufacturingStatus(order, field);
      if (status === 'not_started') {
        return `Start ${name}`;
      } else if (status === 'partial') {
        return `Complete ${name}`;
      }
    }
  }
  
  // Check delivery batches
  if (order.deliveryBatches) {
    const preparing = order.deliveryBatches.filter(b => b.status === 'preparing').length;
    if (preparing > 0) {
      return 'Ship pending batches';
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
    batchesPreparing: 0,
    batchesShipped: 0,
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

      // Fetch construction components for all orders
      const orderIds = (ordersData || []).map(o => o.id);
      let componentsMap: Record<string, ConstructionComponent[]> = {};
      let batchesMap: Record<string, DeliveryBatch[]> = {};
      
      if (orderIds.length > 0) {
        // Fetch construction components
        const { data: componentsData } = await supabase
          .from('construction_components')
          .select(`
            id,
            component_type,
            component_name,
            quantity,
            status,
            construction:order_constructions!inner(order_id)
          `)
          .in('construction.order_id', orderIds);
        
        // Group components by order_id
        (componentsData || []).forEach((comp: any) => {
          const orderId = comp.construction?.order_id;
          if (orderId) {
            if (!componentsMap[orderId]) componentsMap[orderId] = [];
            componentsMap[orderId].push({
              id: comp.id,
              component_type: comp.component_type,
              component_name: comp.component_name,
              quantity: comp.quantity,
              status: comp.status,
            });
          }
        });

        // Fetch delivery batches
        const { data: batchesData } = await supabase
          .from('delivery_batches')
          .select('id, order_id, status, delivery_date')
          .in('order_id', orderIds);
        
        // Group batches by order_id
        (batchesData || []).forEach((batch: any) => {
          if (!batchesMap[batch.order_id]) batchesMap[batch.order_id] = [];
          batchesMap[batch.order_id].push({
            id: batch.id,
            status: batch.status,
            delivery_date: batch.delivery_date,
          });
        });
      }

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
            sliding_doors_profile_status: order.sliding_doors_profile_status,
            sliding_doors_hardware_status: order.sliding_doors_hardware_status,
            fileComponents: componentsMap[order.id] || [],
            deliveryBatches: batchesMap[order.id] || [],
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
        const fields = getComponentFields(order);
        fields.forEach(({ field }) => {
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
        o.manufacturingProgress >= 90 && o.deliveryProgress.batchesDelivered < o.deliveryProgress.totalItems
      ).length;

      // Calculate production status counts
      const onHoldCount = processedOrders.filter(o => o.production_status === 'hold').length;
      const productionReadyCount = processedOrders.filter(o => o.production_status === 'production_ready').length;

      // Calculate batch metrics across all orders
      const batchesPreparing = processedOrders.reduce((sum, o) => sum + o.deliveryProgress.batchesPreparing, 0);
      const batchesShipped = processedOrders.reduce((sum, o) => sum + o.deliveryProgress.batchesShipped, 0);

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
        batchesPreparing,
        batchesShipped,
      });

      // Calculate component summary - include both base and SD components
      const allComponentFields = [
        ...BASE_COMPONENT_FIELDS,
        ...SD_COMPONENT_FIELDS,
      ];
      
      const summary: ComponentSummary[] = allComponentFields.map(({ name, field }) => {
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

      // Calculate manufacturing workload - include both base and SD stages
      const allStages = [
        ...BASE_MANUFACTURING_STAGES,
        ...SD_MANUFACTURING_STAGES,
      ];
      
      const workload: ManufacturingWorkload[] = allStages.map(({ name, field }) => {
        const result: ManufacturingWorkload = {
          stage: name,
          notStarted: 0,
          partial: 0,
          complete: 0,
        };

        processedOrders.forEach(order => {
          // Skip if order doesn't have this stage
          if (field === 'doors_status' && !order.doors_count) return;
          if (field.startsWith('sliding_doors') && !order.sliding_doors_count) return;

          const status = getManufacturingStatus(order, field);
          if (status === 'complete') result.complete++;
          else if (status === 'partial') result.partial++;
          else result.notStarted++;
        });

        return result;
      }).filter(stage => {
        // Only show stages that have at least one order
        return stage.notStarted + stage.partial + stage.complete > 0;
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
