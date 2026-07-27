import fs from 'fs';
const file = 'src/controllers/restaurant.controller.ts';
let code = fs.readFileSync(file, 'utf8');

const regex = /async deleteTable[\s\S]+?try\s*{\s*const\s+{\s*restaurantId,\s*tableId\s*}\s*=\s*req.params;\s*const table\s*=\s*await\s+Table\.findOneAndDelete[^;]+;/;

const newCode = `async deleteTable(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { restaurantId, tableId } = req.params;
      const orderCount = await mongoose.model('Order').countDocuments({ tableId });

      let table;
      let archived = false;
      if (orderCount > 0) {
        table = await Table.findOneAndUpdate(
          { _id: tableId, restaurantId },
          { isArchived: true, isActive: false },
          { new: true }
        );
        archived = true;
      } else {
        table = await Table.findOneAndDelete({ _id: tableId, restaurantId });
      }`;

code = code.replace(regex, newCode);

const regexRes = /sendSuccess\(res,\s*{},\s*'Table deleted successfully'\);/;
code = code.replace(regexRes, `sendSuccess(res, { archived }, 'Table deleted successfully');`);

fs.writeFileSync(file, code);
