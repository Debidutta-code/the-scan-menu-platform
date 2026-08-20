import React, { useState } from 'react';
import { 
  Utensils, 
  Sparkles, 
  Check, 
  X, 
  ShoppingBag, 
  Clock, 
  Bell, 
  Users, 
  Calculator, 
  ChefHat, 
  ShieldCheck, 
  CheckCircle2, 
  Flame, 
  Heart, 
  Plus, 
  Minus, 
  RotateCcw,
  Star
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { soundManager } from '../../utils/sound';

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: 'starters' | 'mains' | 'pizzas' | 'drinks' | 'desserts';
  desc: string;
  tag?: string;
  isVeg?: boolean;
  isSpicy?: boolean;
  isGlutenFree?: boolean;
  isChefSpecial?: boolean;
  prepTime: string;
  calories: number;
  image: string;
  variants?: { name: string; priceDelta: number }[];
  addOns?: { name: string; price: number }[];
  isSoldOut?: boolean;
}

export const INITIAL_DISHES: MenuItem[] = [
  {
    id: 'dish-1',
    name: 'Truffle Wild Mushroom Bruschetta',
    price: 16.5,
    category: 'starters',
    desc: 'Charred artisan sourdough, black truffle emulsion, shaved parmigiano-reggiano, aged balsamic glaze.',
    tag: "Chef's Choice",
    isVeg: true,
    isChefSpecial: true,
    prepTime: '6-8 min',
    calories: 340,
    image: 'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?auto=format&fit=crop&w=600&q=80',
    variants: [
      { name: 'Standard Sourdough', priceDelta: 0 },
      { name: 'Gluten-Free Artisan Bread', priceDelta: 2.0 },
    ],
    addOns: [
      { name: 'Extra Shaved Black Truffle', price: 5.5 },
      { name: 'Fresh Burrata Di Bufala (100g)', price: 6.0 },
    ],
  },
  {
    id: 'dish-2',
    name: 'Prime Wagyu A5 Steak & Frites',
    price: 44.0,
    category: 'mains',
    desc: 'Miyazaki A5 Wagyu striploin, black garlic herb butter, rosemary sea salt hand-cut triple-cooked frites.',
    tag: 'Top Rated',
    isChefSpecial: true,
    prepTime: '14-18 min',
    calories: 780,
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80',
    variants: [
      { name: 'Medium Rare (Recommended)', priceDelta: 0 },
      { name: 'Medium', priceDelta: 0 },
      { name: 'Medium Well', priceDelta: 0 },
    ],
    addOns: [
      { name: 'Seared Wild Foie Gras', price: 12.0 },
      { name: 'Black Truffle Bearnaise Sauce', price: 3.5 },
    ],
  },
  {
    id: 'dish-3',
    name: 'Burrata & San Marzano Wood Pizza',
    price: 24.0,
    category: 'pizzas',
    desc: '48-hour fermented Neapolitan dough, San Marzano DOP tomatoes, creamy Puglia burrata, fresh organic basil.',
    tag: 'Artisanal',
    isVeg: true,
    prepTime: '8-10 min',
    calories: 620,
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80',
    variants: [
      { name: 'Traditional Neapolitan Crust', priceDelta: 0 },
      { name: 'Crispy Roman Thin Crust', priceDelta: 0 },
    ],
    addOns: [
      { name: 'Prosciutto Di Parma (24 Month)', price: 4.5 },
      { name: 'Spicy Calabrian Hot Honey', price: 2.0 },
      { name: 'Extra Burrata Crown', price: 5.0 },
    ],
  },
  {
    id: 'dish-4',
    name: 'Smoked Amber Old Fashioned',
    price: 18.0,
    category: 'drinks',
    desc: 'Small-batch Kentucky bourbon, Angostura & orange bitters, torched cinnamon smoke glass dome.',
    tag: 'Signature Cocktail',
    prepTime: '4 min',
    calories: 190,
    image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=600&q=80',
    addOns: [
      { name: 'Single Large Hand-Carved Ice Sphere', price: 0 },
      { name: 'Double Bourbon Pour (+1.5oz)', price: 6.0 },
    ],
  },
  {
    id: 'dish-5',
    name: 'Valrhona Dark Chocolate Lava Tart',
    price: 15.0,
    category: 'desserts',
    desc: '70% Guanaja Valrhona molten center, Madagascar bourbon vanilla bean gelato, gold leaf flake.',
    tag: 'Decadent',
    isVeg: true,
    prepTime: '10 min',
    calories: 510,
    image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=600&q=80',
    addOns: [
      { name: 'Extra Scoop Bourbon Vanilla Gelato', price: 3.5 },
      { name: 'Salted Caramel Drizzle', price: 1.5 },
    ],
  },
  {
    id: 'dish-6',
    name: 'Crispy Calamari Fritti & Yuzu Aioli',
    price: 17.5,
    category: 'starters',
    desc: 'Flash-fried line-caught calamari, shishito peppers, smoked paprika salt, house-whipped yuzu aioli.',
    tag: 'Popular',
    isSpicy: true,
    prepTime: '7 min',
    calories: 420,
    image: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=600&q=80',
    addOns: [
      { name: 'Double Yuzu Aioli Dip', price: 2.0 },
    ],
  },
];

interface CartItem {
  id: string;
  dishId: string;
  name: string;
  basePrice: number;
  totalPrice: number;
  count: number;
  variant?: string;
  addOns: string[];
  notes?: string;
}

interface InteractiveLiveTableProps {
  onOrderDispatched?: (order: { table: string; items: CartItem[]; total: number; orderNumber: string }) => void;
  soldOutDishIds?: string[];
  onToggleSoldOut?: (dishId: string) => void;
}

export const InteractiveLiveTable: React.FC<InteractiveLiveTableProps> = ({
  onOrderDispatched,
  soldOutDishIds = [],
  onToggleSoldOut,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [dietFilter, setDietFilter] = useState<'all' | 'veg' | 'chef' | 'spicy'>('all');
  const [customizingDish, setCustomizingDish] = useState<MenuItem | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<string>('');
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [specialNotes, setSpecialNotes] = useState<string>('');
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'menu' | 'cart' | 'status' | 'waiter'>('menu');
  
  // Waiter Call State
  const [waiterCallActive, setWaiterCallActive] = useState<string | null>(null);
  const [waiterTimer, setWaiterTimer] = useState<number>(0);
  
  // Bill Split State
  const [splitGuests, setSplitGuests] = useState<number>(2);
  const [tipPercentage, setTipPercentage] = useState<number>(10);
  
  // Order Status State
  const [currentOrder, setCurrentOrder] = useState<{
    orderNumber: string;
    items: CartItem[];
    statusStep: number;
    total: number;
  } | null>(null);

  // Review Modal State
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);

  const categories = [
    { id: 'all', name: 'Full Menu' },
    { id: 'starters', name: 'Starters' },
    { id: 'mains', name: 'Mains & Steaks' },
    { id: 'pizzas', name: 'Wood-Fired Pizza' },
    { id: 'drinks', name: 'Craft Cocktails' },
    { id: 'desserts', name: 'Desserts' },
  ];

  // Filter items
  const filteredDishes = INITIAL_DISHES.filter((dish) => {
    const matchCategory = selectedCategory === 'all' || dish.category === selectedCategory;
    let matchDiet = true;
    if (dietFilter === 'veg') matchDiet = !!dish.isVeg;
    if (dietFilter === 'chef') matchDiet = !!dish.isChefSpecial;
    if (dietFilter === 'spicy') matchDiet = !!dish.isSpicy;
    return matchCategory && matchDiet;
  });

  const openCustomizer = (dish: MenuItem) => {
    if (soldOutDishIds.includes(dish.id) || dish.isSoldOut) return;
    soundManager.playTapSound();
    setCustomizingDish(dish);
    setSelectedVariant(dish.variants?.[0]?.name || '');
    setSelectedAddOns([]);
    setSpecialNotes('');
  };

  const handleAddToCart = () => {
    if (!customizingDish) return;
    soundManager.playTapSound();

    let calculatedPrice = customizingDish.price;
    if (customizingDish.variants && selectedVariant) {
      const variantObj = customizingDish.variants.find((v) => v.name === selectedVariant);
      if (variantObj) calculatedPrice += variantObj.priceDelta;
    }
    if (customizingDish.addOns && selectedAddOns.length > 0) {
      customizingDish.addOns.forEach((addon) => {
        if (selectedAddOns.includes(addon.name)) {
          calculatedPrice += addon.price;
        }
      });
    }

    const newItem: CartItem = {
      id: `${customizingDish.id}-${Date.now()}`,
      dishId: customizingDish.id,
      name: customizingDish.name,
      basePrice: customizingDish.price,
      totalPrice: calculatedPrice,
      count: 1,
      variant: selectedVariant || undefined,
      addOns: [...selectedAddOns],
      notes: specialNotes || undefined,
    };

    setCart((prev) => [...prev, newItem]);
    setCustomizingDish(null);
  };

  const updateItemCount = (itemId: string, delta: number) => {
    soundManager.playTapSound();
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === itemId) {
            const newCount = item.count + delta;
            return newCount > 0 ? { ...item, count: newCount } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  // Calculations
  const subtotal = cart.reduce((acc, item) => acc + item.totalPrice * item.count, 0);
  const tax = subtotal * 0.05; // 5% GST
  const serviceCharge = subtotal * 0.05; // 5% Service
  const tipAmount = (subtotal * tipPercentage) / 100;
  const grandTotal = subtotal + tax + serviceCharge + tipAmount;
  const totalItemCount = cart.reduce((acc, item) => acc + item.count, 0);
  const splitAmount = splitGuests > 0 ? grandTotal / splitGuests : grandTotal;

  // Dispatch Order
  const handlePlaceOrder = () => {
    if (cart.length === 0) return;
    soundManager.playTapSound();

    const orderNum = `#TK-${Math.floor(100 + Math.random() * 900)}`;
    const newOrder = {
      orderNumber: orderNum,
      items: [...cart],
      statusStep: 1,
      total: grandTotal,
    };

    setCurrentOrder(newOrder);
    setCart([]);
    setIsCartOpen(false);
    setActiveTab('status');

    if (onOrderDispatched) {
      onOrderDispatched({
        table: 'Table #04 (Terrace)',
        items: newOrder.items,
        total: grandTotal,
        orderNumber: orderNum,
      });
    }

    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#f59e0b', '#fbbf24', '#10b981', '#ffffff'],
    });

    // Advance timeline simulation
    setTimeout(() => {
      setCurrentOrder((prev) => (prev ? { ...prev, statusStep: 2 } : null));
    }, 3000);
    setTimeout(() => {
      setCurrentOrder((prev) => (prev ? { ...prev, statusStep: 3 } : null));
    }, 7000);
    setTimeout(() => {
      setCurrentOrder((prev) => (prev ? { ...prev, statusStep: 4 } : null));
    }, 12000);
    setTimeout(() => {
      setCurrentOrder((prev) => (prev ? { ...prev, statusStep: 5 } : null));
      setShowReviewModal(true);
    }, 17000);
  };

  // Waiter Call
  const handleCallWaiter = (reason: string) => {
    soundManager.playTapSound();
    setWaiterCallActive(reason);
    setWaiterTimer(1);
    const interval = setInterval(() => {
      setWaiterTimer((prev) => {
        if (prev >= 45) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 1000);
  };

  return (
    <div className="w-full max-w-md mx-auto bg-[#0a0a0e] rounded-[36px] border-4 border-zinc-800 shadow-2xl overflow-hidden text-zinc-100 flex flex-col min-h-[720px] max-h-[820px] relative font-sans">
      
      {/* Smartphone Dynamic Island & Status Bar */}
      <div className="bg-[#050508] px-6 pt-3 pb-2 border-b border-white/5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400">
          <span>9:41</span>
        </div>
        <div className="w-20 h-4 bg-black rounded-full border border-white/10 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-emerald-500/80 animate-pulse" />
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
          <span className="font-mono text-amber-400 font-bold">5G</span>
          <span className="text-zinc-500">100%</span>
        </div>
      </div>

      {/* Restaurant Table Header */}
      <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 p-4 border-b border-white/10 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <h3 className="font-extrabold text-sm text-white tracking-tight">Luminary Bistro & Bar</h3>
            </div>
            <p className="text-[11px] text-amber-400 font-mono-accent font-semibold mt-0.5">
              TABLE #04 • INDOOR TERRACE • PIN: 8421
            </p>
          </div>
          <div className="flex items-center gap-1 bg-amber-400/10 border border-amber-400/20 px-2 py-1 rounded-full text-[10px] font-mono text-amber-400 font-bold">
            <Clock size={11} />
            <span>0.38s EDGE</span>
          </div>
        </div>

        {/* Navigation Tabs Inside Smartphone */}
        <div className="grid grid-cols-4 gap-1 mt-3 bg-black/40 p-1 rounded-xl border border-white/5 text-[11px]">
          <button
            onClick={() => { soundManager.playTapSound(); setActiveTab('menu'); }}
            className={`py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'menu' ? 'bg-amber-400 text-black shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Menu
          </button>
          <button
            onClick={() => { soundManager.playTapSound(); setActiveTab('cart'); }}
            className={`py-1.5 rounded-lg font-bold transition-all relative ${
              activeTab === 'cart' ? 'bg-amber-400 text-black shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Tab ({totalItemCount})
            {totalItemCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold">
                {totalItemCount}
              </span>
            )}
          </button>
          <button
            onClick={() => { soundManager.playTapSound(); setActiveTab('status'); }}
            className={`py-1.5 rounded-lg font-bold transition-all relative ${
              activeTab === 'status' ? 'bg-amber-400 text-black shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Orders
            {currentOrder && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            )}
          </button>
          <button
            onClick={() => { soundManager.playTapSound(); setActiveTab('waiter'); }}
            className={`py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'waiter' ? 'bg-amber-400 text-black shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Call Waiter
          </button>
        </div>
      </div>

      {/* Main Smartphone Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        
        {/* TAB 1: MENU BROWSING */}
        {activeTab === 'menu' && (
          <div className="space-y-4">
            {/* Category Pills Carousel */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => { soundManager.playTapSound(); setSelectedCategory(cat.id); }}
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-amber-400 text-black shadow-md shadow-amber-500/20'
                      : 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/5'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Diet Filter Chips */}
            <div className="flex items-center gap-2 text-[10px]">
              <span className="text-zinc-500 font-mono">FILTERS:</span>
              {[
                { id: 'all', label: 'All' },
                { id: 'veg', label: '🟢 Veg Only' },
                { id: 'chef', label: '⭐ Chef Specials' },
                { id: 'spicy', label: '🌶️ Spicy' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => { soundManager.playTapSound(); setDietFilter(f.id as any); }}
                  className={`px-2 py-0.5 rounded-md border text-[10px] transition-colors ${
                    dietFilter === f.id
                      ? 'bg-zinc-800 text-amber-300 border-amber-400/40'
                      : 'bg-transparent text-zinc-500 border-white/5 hover:text-zinc-300'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Dishes List */}
            <div className="space-y-3">
              {filteredDishes.map((dish) => {
                const isSoldOut = soldOutDishIds.includes(dish.id) || dish.isSoldOut;
                return (
                  <div
                    key={dish.id}
                    onClick={() => openCustomizer(dish)}
                    className={`p-3 rounded-2xl bg-zinc-900/90 border transition-all relative overflow-hidden group ${
                      isSoldOut
                        ? 'opacity-60 border-red-500/30 cursor-not-allowed bg-red-950/10'
                        : 'border-white/10 hover:border-amber-400/50 cursor-pointer active:scale-[0.99]'
                    }`}
                  >
                    {isSoldOut && (
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-red-500 text-white font-mono text-[9px] font-bold tracking-wider uppercase z-10 animate-pulse">
                        86 SOLD OUT
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      {/* Food Thumbnail */}
                      <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-white/10 shadow-sm">
                        <img
                          src={dish.image}
                          alt={dish.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        {dish.isVeg && (
                          <div className="absolute top-1 left-1 w-2.5 h-2.5 bg-black/80 rounded-xs flex items-center justify-center p-0.5 border border-emerald-400">
                            <div className="w-1 h-1 rounded-full bg-emerald-400" />
                          </div>
                        )}
                      </div>

                      <div className="space-y-0.5 flex-1 min-w-0">
                        <h4 className="font-bold text-xs text-white group-hover:text-amber-300 transition-colors truncate">
                          {dish.name}
                        </h4>
                        <p className="text-[10px] text-zinc-400 leading-snug line-clamp-1">
                          {dish.desc}
                        </p>
                        <div className="flex items-center gap-2 pt-0.5">
                          <span className="text-xs font-mono font-extrabold text-amber-400">
                            ${dish.price.toFixed(2)}
                          </span>
                          <span className="text-[9px] text-zinc-500 font-mono">
                            ⏱️ {dish.prepTime}
                          </span>
                        </div>
                      </div>

                      <button
                        disabled={isSoldOut}
                        className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition-transform ${
                          isSoldOut
                            ? 'bg-zinc-800 text-zinc-600'
                            : 'bg-amber-400 text-black hover:scale-110 shadow-md shadow-amber-500/20'
                        }`}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: ACTIVE CART & SPLIT BILL */}
        {activeTab === 'cart' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h4 className="font-extrabold text-xs uppercase tracking-wider text-white">Active Table Tab</h4>
              <span className="text-[10px] text-zinc-400 font-mono">{cart.length} items in cart</span>
            </div>

            {cart.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <ShoppingBag size={32} className="mx-auto text-zinc-600" />
                <p className="text-xs text-zinc-400">Your table tab is currently empty.</p>
                <button
                  onClick={() => setActiveTab('menu')}
                  className="px-4 py-1.5 rounded-full bg-amber-400 text-black text-xs font-bold mt-2"
                >
                  Browse Menu
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div key={item.id} className="p-3 bg-zinc-900 rounded-xl border border-white/5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-white">{item.name}</span>
                        {item.variant && (
                          <span className="block text-[10px] text-amber-400 font-mono">{item.variant}</span>
                        )}
                        {item.addOns.length > 0 && (
                          <span className="block text-[9px] text-zinc-400">
                            + {item.addOns.join(', ')}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-mono font-bold text-amber-400">
                        ${(item.totalPrice * item.count).toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-white/5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateItemCount(item.id, -1)}
                          className="w-5 h-5 rounded bg-zinc-800 text-zinc-300 flex items-center justify-center text-xs"
                        >
                          <Minus size={11} />
                        </button>
                        <span className="text-xs font-mono font-bold">{item.count}</span>
                        <button
                          onClick={() => updateItemCount(item.id, 1)}
                          className="w-5 h-5 rounded bg-zinc-800 text-zinc-300 flex items-center justify-center text-xs"
                        >
                          <Plus size={11} />
                        </button>
                      </div>
                      <span className="text-[10px] text-zinc-500 font-mono">${item.totalPrice.toFixed(2)} ea</span>
                    </div>
                  </div>
                ))}

                {/* Tipping Selector */}
                <div className="p-3 bg-zinc-950 rounded-xl border border-white/5 space-y-2">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
                    Select Staff Tip:
                  </span>
                  <div className="grid grid-cols-4 gap-1">
                    {[0, 10, 15, 20].map((t) => (
                      <button
                        key={t}
                        onClick={() => { soundManager.playTapSound(); setTipPercentage(t); }}
                        className={`py-1 rounded-lg text-xs font-mono font-bold border transition-colors ${
                          tipPercentage === t
                            ? 'bg-amber-400 text-black border-amber-400'
                            : 'bg-zinc-900 text-zinc-400 border-white/5 hover:text-white'
                        }`}
                      >
                        {t === 0 ? 'No Tip' : `${t}%`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bill Split Calculator */}
                <div className="p-3 bg-zinc-950 rounded-xl border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                      <Users size={12} className="text-amber-400" />
                      <span>Split Bill Between Guests</span>
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-400">
                      ${splitAmount.toFixed(2)} / guest
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="1"
                      max="6"
                      value={splitGuests}
                      onChange={(e) => setSplitGuests(parseInt(e.target.value))}
                      className="w-full accent-amber-400"
                    />
                    <span className="text-xs font-mono font-bold text-white px-2 py-0.5 bg-zinc-800 rounded">
                      {splitGuests} {splitGuests === 1 ? 'Guest' : 'Guests'}
                    </span>
                  </div>
                </div>

                {/* Totals Breakdown */}
                <div className="p-3 bg-zinc-900/60 rounded-xl border border-white/5 space-y-1 text-xs font-mono">
                  <div className="flex justify-between text-zinc-400">
                    <span>Subtotal:</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>GST (5%):</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Service (5%):</span>
                    <span>${serviceCharge.toFixed(2)}</span>
                  </div>
                  {tipAmount > 0 && (
                    <div className="flex justify-between text-amber-400">
                      <span>Staff Tip ({tipPercentage}%):</span>
                      <span>${tipAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-white font-extrabold text-sm pt-2 border-t border-white/10">
                    <span>Grand Total:</span>
                    <span className="text-amber-400">${grandTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* Send Order Button */}
                <button
                  onClick={handlePlaceOrder}
                  className="w-full py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                  <ChefHat size={16} />
                  <span>Send Order Directly to Kitchen</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: LIVE ORDER TRACKING */}
        {activeTab === 'status' && (
          <div className="space-y-4">
            <div className="pb-2 border-b border-white/10">
              <h4 className="font-extrabold text-xs uppercase tracking-wider text-white">Live Kitchen Tracking</h4>
              <p className="text-[10px] text-zinc-400">Order telemetry updated via edge WebSocket</p>
            </div>

            {currentOrder ? (
              <div className="space-y-4">
                {/* Active Order Card */}
                <div className="p-4 bg-zinc-900 rounded-2xl border border-amber-400/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-mono font-bold text-amber-400">{currentOrder.orderNumber}</span>
                      <span className="block text-[10px] text-zinc-400">Table #04 • {currentOrder.items.length} items</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-amber-400/10 text-amber-400 border border-amber-400/20">
                      ${currentOrder.total.toFixed(2)}
                    </span>
                  </div>

                  {/* 5-Step Status Progress Tracker */}
                  <div className="space-y-2 pt-2">
                    {[
                      { step: 1, label: 'Order Sent & Dispatched', sub: 'Pre-assigned Table Token verified' },
                      { step: 2, label: 'Kitchen Confirmed & Ticket Printed', sub: 'Thermal KDS station routing' },
                      { step: 3, label: 'Chef Actively Cooking', sub: 'Est. completion in 6-10 min' },
                      { step: 4, label: 'Plated & Quality Checked', sub: 'Garnished & under warmer' },
                      { step: 5, label: 'En Route & Served at Table', sub: 'Enjoy your meal!' },
                    ].map((s) => {
                      const isComplete = currentOrder.statusStep >= s.step;
                      const isCurrent = currentOrder.statusStep === s.step;
                      return (
                        <div key={s.step} className="flex items-start gap-3">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${
                            isComplete
                              ? 'bg-emerald-400 text-black'
                              : 'bg-zinc-800 text-zinc-600 border border-white/5'
                          }`}>
                            {isComplete ? <Check size={12} /> : s.step}
                          </div>
                          <div>
                            <span className={`text-xs font-bold block ${
                              isCurrent ? 'text-amber-400' : isComplete ? 'text-white' : 'text-zinc-600'
                            }`}>
                              {s.label}
                            </span>
                            <span className="text-[9px] text-zinc-500 block">{s.sub}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Items in this order */}
                <div className="p-3 bg-zinc-950 rounded-xl border border-white/5 space-y-1">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase">Items Cooking:</span>
                  {currentOrder.items.map((it, i) => (
                    <div key={i} className="flex justify-between text-xs text-zinc-300">
                      <span>{it.count}x {it.name}</span>
                      <span className="font-mono text-zinc-400">${(it.totalPrice * it.count).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 space-y-2">
                <Clock size={32} className="mx-auto text-zinc-600" />
                <p className="text-xs text-zinc-400">No active kitchen orders right now.</p>
                <button
                  onClick={() => setActiveTab('menu')}
                  className="px-4 py-1.5 rounded-full bg-amber-400 text-black text-xs font-bold mt-2"
                >
                  Place an Order
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: CALL WAITER & PAGING */}
        {activeTab === 'waiter' && (
          <div className="space-y-4">
            <div className="pb-2 border-b border-white/10">
              <h4 className="font-extrabold text-xs uppercase tracking-wider text-white">Instant Waiter Paging</h4>
              <p className="text-[10px] text-zinc-400">Pings floor staff wristwatches & manager dashboard</p>
            </div>

            {waiterCallActive ? (
              <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-emerald-400/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <Bell size={20} className="animate-bounce" />
                </div>
                <div>
                  <h5 className="font-bold text-xs text-white">Request Dispatched to Server!</h5>
                  <p className="text-[10px] text-zinc-300 mt-0.5">
                    "{waiterCallActive}" • Table #04
                  </p>
                  <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full bg-emerald-400/10 text-emerald-400 font-mono text-[10px] font-bold">
                    Elapsed: {waiterTimer}s • Staff Acknowledged
                  </span>
                </div>
                <button
                  onClick={() => setWaiterCallActive(null)}
                  className="px-4 py-1.5 rounded-full bg-zinc-800 text-zinc-300 text-xs font-semibold hover:text-white"
                >
                  Cancel Request
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: '💧 Water Refill', reason: 'Water Refill Requested' },
                  { label: '🍴 Extra Cutlery', reason: 'Extra Cutlery & Napkins' },
                  { label: '💳 Request Bill / POS', reason: 'Physical Card POS Requested' },
                  { label: '🧹 Clean Table', reason: 'Table Wipe & Clean' },
                  { label: '🙋 Call Waiter', reason: 'General Table Assistance' },
                  { label: '🍷 Sommelier Call', reason: 'Wine Consultation' },
                ].map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleCallWaiter(item.reason)}
                    className="p-3 bg-zinc-900 hover:bg-zinc-800 rounded-xl border border-white/10 hover:border-amber-400/50 text-left transition-all flex flex-col justify-between h-20 active:scale-[0.98]"
                  >
                    <span className="text-xs font-bold text-white">{item.label}</span>
                    <span className="text-[9px] text-amber-400 font-mono">1-Tap Alert →</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* DISH CUSTOMIZER MODAL */}
      {customizingDish && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md z-30 flex flex-col justify-end p-4 animate-in fade-in slide-in-from-bottom-8">
          <div className="bg-zinc-950 border border-white/15 rounded-3xl p-5 space-y-4 max-h-[90%] overflow-y-auto shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono text-amber-400 uppercase font-bold">CUSTOMIZE DISH</span>
                <h3 className="font-extrabold text-sm text-white">{customizingDish.name}</h3>
                <span className="text-xs font-mono font-bold text-amber-400">
                  Base: ${customizingDish.price.toFixed(2)}
                </span>
              </div>
              <button
                onClick={() => setCustomizingDish(null)}
                className="w-7 h-7 rounded-full bg-zinc-900 text-zinc-400 hover:text-white flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            {/* Variants */}
            {customizingDish.variants && (
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
                  Select Preparation / Variant:
                </span>
                <div className="space-y-1.5">
                  {customizingDish.variants.map((v) => (
                    <button
                      key={v.name}
                      onClick={() => { soundManager.playTapSound(); setSelectedVariant(v.name); }}
                      className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between text-xs transition-colors ${
                        selectedVariant === v.name
                          ? 'bg-amber-400/10 border-amber-400 text-white font-bold'
                          : 'bg-zinc-900 border-white/5 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <span>{v.name}</span>
                      <span className="font-mono text-[10px] text-amber-400">
                        {v.priceDelta === 0 ? 'Included' : `+$${v.priceDelta.toFixed(2)}`}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Add-ons */}
            {customizingDish.addOns && (
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
                  Optional Add-ons:
                </span>
                <div className="space-y-1.5">
                  {customizingDish.addOns.map((add) => {
                    const isSelected = selectedAddOns.includes(add.name);
                    return (
                      <button
                        key={add.name}
                        onClick={() => {
                          soundManager.playTapSound();
                          setSelectedAddOns((prev) =>
                            isSelected ? prev.filter((n) => n !== add.name) : [...prev, add.name]
                          );
                        }}
                        className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between text-xs transition-colors ${
                          isSelected
                            ? 'bg-amber-400/10 border-amber-400 text-white font-bold'
                            : 'bg-zinc-900 border-white/5 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className={`w-3.5 h-3.5 rounded flex items-center justify-center border text-[9px] ${
                            isSelected ? 'bg-amber-400 text-black border-amber-400' : 'border-zinc-700'
                          }`}>
                            {isSelected && <Check size={10} />}
                          </span>
                          {add.name}
                        </span>
                        <span className="font-mono text-[10px] text-amber-400">
                          +${add.price.toFixed(2)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Special Instructions Note */}
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
                Allergy / Cooking Instructions:
              </span>
              <input
                type="text"
                value={specialNotes}
                onChange={(e) => setSpecialNotes(e.target.value)}
                placeholder="e.g. No onions, dressing on side..."
                className="w-full px-3 py-2 bg-zinc-900 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Confirm Add to Cart */}
            <button
              onClick={handleAddToCart}
              className="w-full py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2"
            >
              <Plus size={14} />
              <span>Add to Table Tab</span>
            </button>
          </div>
        </div>
      )}

      {/* 5-STAR REVIEW MODAL SIMULATION */}
      {showReviewModal && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-md z-40 flex items-center justify-center p-4 animate-in fade-in zoom-in-95">
          <div className="bg-zinc-950 border-2 border-amber-400/50 rounded-3xl p-6 text-center space-y-4 max-w-xs shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-amber-400/20 text-amber-400 flex items-center justify-center mx-auto">
              <Star size={24} className="fill-amber-400" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-white">How was your dining experience?</h4>
              <p className="text-[10px] text-zinc-400 mt-1">
                Your feedback helps Luminary Bistro maintain 5-star service.
              </p>
            </div>

            {/* Star selector */}
            <div className="flex justify-center gap-1 py-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  onClick={() => { soundManager.playTapSound(); setReviewRating(s); }}
                  className="p-1 text-amber-400 hover:scale-125 transition-transform"
                >
                  <Star size={20} className={s <= reviewRating ? 'fill-amber-400' : 'text-zinc-600'} />
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                soundManager.playTapSound();
                setShowReviewModal(false);
                confetti({ particleCount: 50, spread: 50 });
              }}
              className="w-full py-2.5 rounded-xl bg-amber-400 text-black font-bold text-xs"
            >
              Post to Google Reviews ↗
            </button>
          </div>
        </div>
      )}

      {/* Phone Home Bar */}
      <div className="bg-[#050508] py-2 flex justify-center shrink-0 border-t border-white/5">
        <div className="w-28 h-1 bg-zinc-700 rounded-full" />
      </div>
    </div>
  );
};
