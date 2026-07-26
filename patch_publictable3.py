import re

with open('client/src/pages/PublicTable.tsx', 'r') as f:
    content = f.read()

content = content.replace("import { publicService, PublicCategory, MenuItem, AddOn, Tax } from '../services/restaurant.service';", "import { publicService, PublicCategory, MenuItem, AddOn } from '../services/restaurant.service';")

with open('client/src/pages/PublicTable.tsx', 'w') as f:
    f.write(content)
