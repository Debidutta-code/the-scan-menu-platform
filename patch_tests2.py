import re

with open('server/src/orders.test.ts', 'r') as f:
    content = f.read()

search_rest = """    const restaurant = await Restaurant.create({
      name: 'Tasty Bites',
      slug: 'tasty-bites',
      taxRatePercent: 5.0,
      isActive: true,
    });"""

replace_rest = """    const restaurant = await Restaurant.create({
      name: 'Tasty Bites',
      slug: 'tasty-bites',
      taxRatePercent: 5.0,
      isActive: true,
    });

    await Tax.create({
      restaurantId: restaurant.id,
      name: 'VAT',
      percentage: 5.0,
      isActive: true,
    });"""
content = content.replace(search_rest, replace_rest)

search_rest2 = """    const restaurant = await Restaurant.create({
      name: 'Merge Test Cafe',
      slug: 'merge-cafe',
      taxRatePercent: 10.0,
      isActive: true,
    });"""

replace_rest2 = """    const restaurant = await Restaurant.create({
      name: 'Merge Test Cafe',
      slug: 'merge-cafe',
      taxRatePercent: 10.0,
      isActive: true,
    });

    await Tax.create({
      restaurantId: restaurant.id,
      name: 'Service Tax',
      percentage: 10.0,
      isActive: true,
    });"""

content = content.replace(search_rest2, replace_rest2)

with open('server/src/orders.test.ts', 'w') as f:
    f.write(content)
