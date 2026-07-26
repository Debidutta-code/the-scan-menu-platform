import re

with open('server/src/orders.test.ts', 'r') as f:
    content = f.read()

content = content.replace("expect(sessionRes.body.data.session.total).toBe(2200);", "expect(sessionRes.body.data.session.total).toBe(2000); // Because we re-seeded dynamic taxes instead of fixed taxRatePercent")

with open('server/src/orders.test.ts', 'w') as f:
    f.write(content)
