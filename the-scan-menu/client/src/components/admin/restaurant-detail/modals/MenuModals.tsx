import React from 'react';
import { Category } from '../../../../services/restaurant.service';

interface AddCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryData: { name: string; description: string; sortOrder: number };
  setCategoryData: React.Dispatch<React.SetStateAction<{ name: string; description: string; sortOrder: number }>>;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export const AddCategoryModal: React.FC<AddCategoryModalProps> = ({
  isOpen,
  onClose,
  categoryData,
  setCategoryData,
  onSubmit,
  isSubmitting,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
        <h3 className="font-display text-lg font-bold text-slate-900">Add Menu Category</h3>

        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-bold text-slate-700">Category Name *</label>
            <input
              type="text"
              placeholder="e.g. Starters, Main Course, Beverages"
              value={categoryData.name}
              onChange={(e) => setCategoryData({ ...categoryData, name: e.target.value })}
              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700">Description (Optional)</label>
            <input
              type="text"
              placeholder="Short category description"
              value={categoryData.description}
              onChange={(e) => setCategoryData({ ...categoryData, description: e.target.value })}
              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={!categoryData.name || isSubmitting}
            className="px-4 py-2 bg-slate-950 text-white rounded-xl text-xs font-bold disabled:opacity-50"
          >
            Create Category
          </button>
        </div>
      </div>
    </div>
  );
};

interface AddDishModalProps {
  isOpen: boolean;
  onClose: () => void;
  dishData: {
    name: string;
    categoryId: string;
    price: number;
    isVegetarian: boolean;
    isSpicy: boolean;
    isChefsSpecial: boolean;
    description: string;
    imageUrl: string;
  };
  setDishData: React.Dispatch<
    React.SetStateAction<{
      name: string;
      categoryId: string;
      price: number;
      isVegetarian: boolean;
      isSpicy: boolean;
      isChefsSpecial: boolean;
      description: string;
      imageUrl: string;
    }>
  >;
  onSubmit: () => void;
  isSubmitting: boolean;
  categoriesList: Category[];
}

export const AddDishModal: React.FC<AddDishModalProps> = ({
  isOpen,
  onClose,
  dishData,
  setDishData,
  onSubmit,
  isSubmitting,
  categoriesList,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <h3 className="font-display text-lg font-bold text-slate-900">Add Menu Dish</h3>

        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-bold text-slate-700">Dish Name *</label>
            <input
              type="text"
              placeholder="e.g. Paneer Butter Masala"
              value={dishData.name}
              onChange={(e) => setDishData({ ...dishData, name: e.target.value })}
              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700">Category *</label>
              <select
                value={dishData.categoryId}
                onChange={(e) => setDishData({ ...dishData, categoryId: e.target.value })}
                className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
              >
                <option value="">Select Category</option>
                {categoriesList.map((cat: Category) => (
                  <option key={cat._id} value={cat._id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700">Price (₹) *</label>
              <input
                type="number"
                min="0"
                placeholder="250"
                value={dishData.price || ''}
                onChange={(e) => setDishData({ ...dishData, price: Number(e.target.value) })}
                className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700">Description</label>
            <input
              type="text"
              placeholder="Ingredients and culinary style"
              value={dishData.description}
              onChange={(e) => setDishData({ ...dishData, description: e.target.value })}
              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700">Image URL (Optional)</label>
            <input
              type="text"
              placeholder="https://example.com/dish.jpg"
              value={dishData.imageUrl}
              onChange={(e) => setDishData({ ...dishData, imageUrl: e.target.value })}
              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div className="flex items-center gap-4 pt-1">
            <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer text-emerald-700">
              <input
                type="checkbox"
                checked={dishData.isVegetarian}
                onChange={(e) => setDishData({ ...dishData, isVegetarian: e.target.checked })}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span>Pure Veg</span>
            </label>

            <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer text-rose-700">
              <input
                type="checkbox"
                checked={dishData.isSpicy}
                onChange={(e) => setDishData({ ...dishData, isSpicy: e.target.checked })}
                className="rounded text-rose-600 focus:ring-rose-500"
              />
              <span>Spicy</span>
            </label>

            <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer text-amber-700">
              <input
                type="checkbox"
                checked={dishData.isChefsSpecial}
                onChange={(e) => setDishData({ ...dishData, isChefsSpecial: e.target.checked })}
                className="rounded text-amber-600 focus:ring-amber-500"
              />
              <span>Chef's Special</span>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={!dishData.name || !dishData.categoryId || isSubmitting}
            className="px-4 py-2 bg-slate-950 text-white rounded-xl text-xs font-bold disabled:opacity-50"
          >
            Add Dish to Menu
          </button>
        </div>
      </div>
    </div>
  );
};
