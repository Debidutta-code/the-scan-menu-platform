sed -i 's/const duplicate = await Table.findOne({/const duplicate = await Table.findOne({ isArchived: false,/' server/src/controllers/restaurant.controller.ts
