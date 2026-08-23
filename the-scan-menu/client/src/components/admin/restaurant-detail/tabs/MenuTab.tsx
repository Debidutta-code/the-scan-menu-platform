import React from 'react';
import { Sparkles, Layers, Plus, Trash2 } from 'lucide-react';
import { Category, MenuItem } from '../../../../services/restaurant.service';

interface MenuTabProps {
  menuItemsList: MenuItem[];
  categoriesList: Category[];
  filteredDishes: MenuItem[];
  selectedMenuCategory: string;
  setSelectedMenuCategory: (catId: string) => void;
  onOpenAddCategoryModal: () => void;
  onOpenAddDishModal: () => void;
  onSeedDemoMenu: () => void;
  isSeedingMenu: boolean;
  onDeleteCategory: (catId: string) => void;
  onDeleteDish: (dishId: string) => void;
}

export const MenuTab: React.FC<MenuTabProps> = ({
  menuItemsList,
  categoriesList,
  filteredDishes,
  selectedMenuCategory,
  setSelectedMenuCategory,
  onOpenAddCategoryModal,
  onOpenAddDishModal,
  onSeedDemoMenu,
  isSeedingMenu,
  onDeleteCategory,
  onDeleteDish,
}) => {
  return (
    <div className="bg-white border border-slate-150 rounded-3xl p-6 md:p-8 shadow-sm space-y-6 h-full overflow-y-auto pr-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h3 className="font-display text-xl font-bold text-slate-900">
            Digital Menu & Catalog ({menuItemsList.length} Dishes)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage menu categories, dishes, prices, food tags, and images.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {menuItemsList.length === 0 && (
            <button
              onClick={onSeedDemoMenu}
              disabled={isSeedingMenu}
              className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-200 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Seed Demo Menu (12 Dishes)</span>
            </button>
          )}

          <button
            onClick={onOpenAddCategoryModal}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
          >
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <span>+ Add Category</span>
          </button>

          <button
            onClick={onOpenAddDishModal}
            className="px-3.5 py-2 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>Add Dish</span>
          </button>
        </div>
      </div>

      {/* Category Tabs Strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedMenuCategory('ALL')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            selectedMenuCategory === 'ALL'
              ? 'bg-slate-950 text-white'
              : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
          }`}
        >
          All Dishes ({menuItemsList.length})
        </button>

        {categoriesList.map((cat: Category) => (
          <div key={cat._id} className="flex items-center">
            <button
              onClick={() => setSelectedMenuCategory(cat._id)}
              className={`px-3 py-1.5 rounded-l-xl text-xs font-bold transition whitespace-nowrap ${
                selectedMenuCategory === cat._id
                  ? 'bg-slate-950 text-white'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {cat.name}
            </button>
            <button
              onClick={() => onDeleteCategory(cat._id)}
              className="px-1.5 py-1.5 bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded-r-xl text-xs font-bold border-l border-slate-200 transition"
              title="Delete Category"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Dishes Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredDishes.map((dish: MenuItem) => (
          <div
            key={dish._id}
            className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center ${
                      dish.isVegetarian ? 'border-emerald-600' : 'border-rose-600'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        dish.isVegetarian ? 'bg-emerald-600' : 'bg-rose-600'
                      }`}
                    />
                  </span>
                  <h4 className="font-bold text-xs text-slate-900">{dish.name}</h4>
                </div>

                <button
                  onClick={() => onDeleteDish(dish._id)}
                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                  title="Delete Dish"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {dish.description && (
                <p className="text-[11px] text-slate-500 line-clamp-2 mt-1.5">{dish.description}</p>
              )}
            </div>

            <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between">
              <span className="font-mono font-black text-sm text-slate-900">
                ₹{(dish.price / 100).toFixed(0)}
              </span>

              <div className="flex items-center gap-1 text-[10px]">
                {dish.isSpicy && <span className="text-rose-500 font-bold">🌶️ Spicy</span>}
                {dish.isChefsSpecial && <span className="text-amber-600 font-bold">⭐ Chef's</span>}
              </div>
            </div>
          </div>
        ))}

        {filteredDishes.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs bg-slate-50 rounded-3xl border border-dashed border-slate-200">
            No dishes found in this category. Click "Add Dish" or "Seed Demo Menu".
          </div>
        )}
      </div>
    </div>
  );
};
