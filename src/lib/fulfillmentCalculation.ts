interface OrderFulfillment {
  reinforcement_cutting: string | null;
  profile_cutting: string | null;
  welding_status: string | null;
  doors_status: string | null;
  sliding_doors_status: string | null;
  assembly_status: string | null;
  glass_status: string | null;
  screens_cutting: string | null;
}

interface OrderDetails {
  doors_count?: number;
  has_sliding_doors?: boolean;
  fulfillment_percentage?: number;
}

const getStatusPoints = (status: string | null | undefined, weight: number): number => {
  if (status === 'complete') return weight;
  if (status === 'partial') return weight * 0.5;
  return 0;
};

export function calculateFulfillmentPercentage(
  order: OrderDetails,
  fulfillment?: OrderFulfillment | null
): number {
  if (!fulfillment) return order.fulfillment_percentage || 0;

  let totalSteps = 0;
  let completedSteps = 0;

  totalSteps += 10;
  completedSteps += getStatusPoints(fulfillment.reinforcement_cutting, 10);

  totalSteps += 10;
  completedSteps += getStatusPoints(fulfillment.profile_cutting, 10);

  totalSteps += 10;
  completedSteps += getStatusPoints(fulfillment.welding_status, 10);

  if (order.doors_count && order.doors_count > 0) {
    totalSteps += 10;
    completedSteps += getStatusPoints(fulfillment.doors_status, 10);
  }

  if (order.has_sliding_doors) {
    totalSteps += 10;
    completedSteps += getStatusPoints(fulfillment.sliding_doors_status, 10);
  }

  totalSteps += 15;
  completedSteps += getStatusPoints(fulfillment.assembly_status, 15);

  totalSteps += 25;
  completedSteps += getStatusPoints(fulfillment.glass_status, 25);

  totalSteps += 10;
  completedSteps += getStatusPoints(fulfillment.screens_cutting, 10);

  return Math.round((completedSteps / totalSteps) * 100);
}
