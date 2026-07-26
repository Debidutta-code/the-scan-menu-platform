import re

with open('client/src/pages/PublicTable.tsx', 'r') as f:
    content = f.read()

search_queries = """  // Query public menu
  const { data: menuData, isLoading: isMenuLoading } = useQuery({
    queryKey: ['publicMenu', restaurantSlug, tableToken],
    queryFn: () => publicService.getPublicMenu(restaurantSlug!, tableToken!),
    enabled: !!restaurantSlug && !!tableToken,
    retry: false,
  });

  const { data: taxesData } = useQuery({
    queryKey: ['publicTaxes', restaurant?._id],
    queryFn: async () => {
       const res = await apiClient.get(`/restaurants/${restaurant?._id}/taxes`);
       return res.data;
    },
    enabled: !!restaurant?._id,
  });
  const activeTaxes: Tax[] = taxesData?.data || [];"""

replace_queries = """  // Query public menu
  const { data: menuData, isLoading: isMenuLoading } = useQuery({
    queryKey: ['publicMenu', restaurantSlug, tableToken],
    queryFn: () => publicService.getPublicMenu(restaurantSlug!, tableToken!),
    enabled: !!restaurantSlug && !!tableToken,
    retry: false,
  });

  const restaurantId = tableData?.data?.restaurant?._id;
  const { data: taxesData } = useQuery({
    queryKey: ['publicTaxes', restaurantId],
    queryFn: async () => {
       const res = await apiClient.get(`/public/restaurants/${restaurantId}/taxes`);
       return res.data;
    },
    enabled: !!restaurantId,
  });
  const activeTaxes: any[] = taxesData?.data || [];"""

content = content.replace(search_queries, replace_queries)

search_tax_type = """import { publicService, PublicCategory, MenuItem, AddOn } from '../services/restaurant.service';"""
replace_tax_type = """import { publicService, PublicCategory, MenuItem, AddOn, Tax } from '../services/restaurant.service';"""
content = content.replace(search_tax_type, replace_tax_type)

with open('client/src/pages/PublicTable.tsx', 'w') as f:
    f.write(content)
