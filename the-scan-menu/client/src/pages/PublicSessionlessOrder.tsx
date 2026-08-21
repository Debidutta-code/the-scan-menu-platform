import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Fuse from 'fuse.js';
import { Helmet } from 'react-helmet-async';
import {
  ShoppingBag,
  Truck,
  Search,
  Plus,
  Minus,
  MapPin,
  Phone,
  User,
  CheckCircle2,
  AlertTriangle,
  Loader,
  ChevronRight,
} from 'lucide-react';
import apiClient from '../lib/api';
import { useCartStore } from '../store/useCartStore';
import { useToast } from '../hooks/useToast';

const loadRazorpay = () => {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const formatPrice = (amountInPaise: number, currency: string) => {
  const amount = amountInPaise / 100;
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency || 'INR',
    minimumFractionDigits: 0,
  }).format(amount);
};

export const PublicSessionlessOrder: React.FC = () => {
  const { restaurantSlug } = useParams<{ restaurantSlug?: string }>();
  const { toast } = useToast();

  const { items: cartItems, addItem, updateQuantity, clearCart } = useCartStore();

  const [orderMode, setOrderMode] = useState<'TAKEAWAY' | 'DELIVERY'>('TAKEAWAY');
  const [activeTab, setActiveTab] = useState<'menu' | 'cart' | 'confirmation'>('menu');
  const [searchQuery, setSearchQuery] = useState('');

  // Form Fields
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Public Menu & Restaurant Info
  const { data: menuData, isLoading, error } = useQuery({
    queryKey: ['sessionlessMenu', restaurantSlug],
    queryFn: async () => {
      const url = restaurantSlug ? `/public/restaurants/${restaurantSlug}/menu` : `/public/menu`;
      const res = await apiClient.get(url);
      return res.data;
    },
    enabled: true,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (error || !menuData?.success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-150 text-center space-y-4 shadow-sm">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-2xl font-bold font-display text-slate-900">Restaurant Not Found</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            The requested restaurant ordering page could not be loaded. Please verify the web address.
          </p>
        </div>
      </div>
    );
  }

  const { restaurant, categories } = menuData.data;
  const currency = restaurant.currency || 'INR';
  const paymentConfig = restaurant.paymentConfig || {};
  const isRazorpayActive = paymentConfig.activeProvider === 'RAZORPAY';

  // Filter Categories & Items
  const allItems = categories.flatMap((c: any) => c.menuItems);
  const fuse = new Fuse(allItems, {
    keys: ['name', 'description'],
    threshold: 0.4,
    ignoreLocation: true,
  });
  
  const searchResults = searchQuery
    ? new Set(fuse.search(searchQuery).map((r: any) => r.item._id))
    : null;

  const filteredCategories = categories.map((cat: any) => ({
    ...cat,
    menuItems: cat.menuItems.filter((item: any) =>
      !searchQuery || (searchResults && searchResults.has(item._id))
    ),
  })).filter((cat: any) => cat.menuItems.length > 0);

  const cartSubtotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const handleCheckout = async () => {
    if (!customerName.trim()) {
      toast('Please enter your full name', 'error');
      return;
    }
    if (!customerPhone.trim() || customerPhone.trim().length < 10) {
      toast('Please enter a valid phone number', 'error');
      return;
    }
    if (orderMode === 'DELIVERY' && !streetAddress.trim()) {
      toast('Please enter your delivery street address', 'error');
      return;
    }
    if (cartItems.length === 0) {
      toast('Your cart is empty', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        orderMode,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        deliveryAddress: orderMode === 'DELIVERY'
          ? { street: streetAddress.trim(), city: city.trim(), zipCode: zipCode.trim(), fullAddress: `${streetAddress}, ${city} ${zipCode}`.trim() }
          : undefined,
        customerNote: customerNote.trim() || undefined,
        items: cartItems.map((item) => ({
          itemId: item.itemId,
          quantity: item.quantity,
          selectedAddOns: item.selectedAddOns.map((addon) => ({
            name: addon.name,
            priceDelta: addon.priceDelta,
          })),
          specialInstructions: item.specialInstructions || '',
        })),
        paymentStatus: 'PENDING',
      };

      const orderUrl = restaurantSlug ? `/public/restaurants/${restaurantSlug}/orders` : `/public/orders`;
      const orderRes = await apiClient.post(orderUrl, payload);

      if (orderRes.data.success) {
        const newOrder = orderRes.data.data;

        if (orderMode === 'DELIVERY' && isRazorpayActive) {
          const isScriptLoaded = await loadRazorpay();
          if (!isScriptLoaded) {
            toast('Failed to load Razorpay payment gateway', 'error');
            setIsSubmitting(false);
            return;
          }

          const intentUrl = restaurantSlug ? `/public/restaurants/${restaurantSlug}/payments/intent` : `/public/payments/intent`;
          const intentRes = await apiClient.post(intentUrl, {
            amount: newOrder.total,
            currency: 'INR',
            metadata: { orderId: newOrder._id },
          });

          const { providerReferenceId, amount, razorpayKeyId } = intentRes.data.data;

          const options = {
            key: razorpayKeyId,
            amount,
            currency: 'INR',
            name: restaurant.name,
            description: `Delivery Order #${newOrder.orderNumber}`,
            order_id: providerReferenceId,
            handler: function () {
              toast('Payment successful! Your order has been placed.', 'success');
              clearCart();
              setActiveTab('confirmation');
              setIsSubmitting(false);
            },
            prefill: { name: customerName, contact: customerPhone },
            modal: {
              ondismiss: function () {
                setIsSubmitting(false);
                toast('Payment cancelled.', 'error');
              },
            },
          };

          const rzp = new (window as any).Razorpay(options);
          rzp.open();
        } else {
          toast('Order placed successfully!', 'success');
          clearCart();
          setActiveTab('confirmation');
          setIsSubmitting(false);
        }
      }
    } catch (err: any) {
      console.error(err);
      toast(err.response?.data?.error?.message || 'Failed to place order', 'error');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-28">
      <Helmet>
        <title>{restaurant.name} - Online Ordering ({orderMode === 'TAKEAWAY' ? 'Takeaway' : 'Delivery'})</title>
      </Helmet>

      {/* Header Banner */}
      <div className="bg-slate-900 text-white p-6 relative overflow-hidden">
        <div className="max-w-xl mx-auto flex items-center justify-between relative z-10">
          <div>
            <h1 className="text-2xl font-bold font-display tracking-tight">{restaurant.name}</h1>
            <p className="text-xs text-amber-400 font-medium flex items-center gap-1 mt-1">
              <span>Online Direct Ordering</span>
            </p>
          </div>
          {/* Mode Switcher Pills */}
          <div className="bg-slate-800/90 p-1 rounded-2xl flex items-center border border-slate-700">
            <button
              onClick={() => setOrderMode('TAKEAWAY')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                orderMode === 'TAKEAWAY' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-300 hover:text-white'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Takeaway</span>
            </button>
            <button
              onClick={() => setOrderMode('DELIVERY')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                orderMode === 'DELIVERY' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Delivery</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
        {/* Navigation Tabs */}
        {activeTab !== 'confirmation' && (
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab('menu')}
              className={`pb-3 px-4 font-bold text-sm border-b-2 transition ${
                activeTab === 'menu' ? 'border-amber-500 text-slate-900' : 'border-transparent text-slate-400'
              }`}
            >
              Menu
            </button>
            <button
              onClick={() => setActiveTab('cart')}
              className={`pb-3 px-4 font-bold text-sm border-b-2 transition relative ${
                activeTab === 'cart' ? 'border-amber-500 text-slate-900' : 'border-transparent text-slate-400'
              }`}
            >
              Basket {cartItems.length > 0 && <span className="ml-1 bg-amber-500 text-slate-950 text-[10px] px-1.5 py-0.5 rounded-full font-mono">{cartItems.length}</span>}
            </button>
          </div>
        )}

        {/* ==================== MENU TAB ==================== */}
        {activeTab === 'menu' && (
          <div className="space-y-6">
            {/* Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder="Search food items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Category Listing */}
            {filteredCategories.map((cat: any) => (
              <div key={cat._id} className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900 tracking-wide uppercase font-mono">{cat.name}</h3>
                <div className="grid grid-cols-1 gap-3">
                  {cat.menuItems.map((item: any) => {
                    const inCart = cartItems.find((i) => i.itemId === item._id);
                    return (
                      <div
                        key={item._id}
                        className="bg-white p-4 rounded-2xl border border-slate-150 shadow-sm flex items-center justify-between gap-4"
                      >
                        <div className="space-y-1 flex-1">
                          <h4 className="text-sm font-bold text-slate-900">{item.name}</h4>
                          <p className="text-xs text-slate-400 line-clamp-1">{item.description}</p>
                          <span className="text-xs font-bold font-mono text-slate-800 block">
                            {formatPrice(item.price, currency)}
                          </span>
                        </div>
                        {inCart ? (
                          <div className="flex items-center gap-2 bg-slate-900 text-white rounded-xl px-2.5 py-1 text-xs font-bold">
                            <button onClick={() => updateQuantity(item._id, inCart.selectedAddOns, inCart.specialInstructions || '', -1)}><Minus className="w-3.5 h-3.5" /></button>
                            <span className="w-4 text-center font-mono">{inCart.quantity}</span>
                            <button onClick={() => updateQuantity(item._id, inCart.selectedAddOns, inCart.specialInstructions || '', 1)}><Plus className="w-3.5 h-3.5" /></button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addItem({ itemId: item._id, name: item.name, basePrice: item.price, quantity: 1, selectedAddOns: [] })}
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-extrabold transition shadow-sm"
                          >
                            + Add
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ==================== CART / CHECKOUT TAB ==================== */}
        {activeTab === 'cart' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-3xl border border-slate-150 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 border-b pb-2">Customer Information</h3>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Full Name *</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Enter your name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full bg-slate-50 pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Mobile Phone Number *</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="tel"
                      placeholder="Enter 10-digit phone"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full bg-slate-50 pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                {orderMode === 'DELIVERY' && (
                  <>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Delivery Street Address *</label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="text"
                          placeholder="Street name, house/flat no."
                          value={streetAddress}
                          onChange={(e) => setStreetAddress(e.target.value)}
                          className="w-full bg-slate-50 pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="City"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <input
                        type="text"
                        placeholder="Pincode / Zip"
                        value={zipCode}
                        onChange={(e) => setZipCode(e.target.value)}
                        className="bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Special Order Note (Optional)</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Less spicy, leave at door..."
                    value={customerNote}
                    onChange={(e) => setCustomerNote(e.target.value)}
                    className="w-full bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Cart Items Summary */}
            <div className="bg-white p-5 rounded-3xl border border-slate-150 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-900 border-b pb-2">Order Items</h3>
              {cartItems.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2">Your basket is empty.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {cartItems.map((item) => (
                    <div key={item.itemId} className="py-2 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-slate-900">{item.name} x{item.quantity}</span>
                      </div>
                      <span className="font-mono font-bold text-slate-800">{formatPrice(item.price * item.quantity, currency)}</span>
                    </div>
                  ))}
                  <div className="pt-3 flex justify-between text-sm font-bold text-slate-900 border-t border-slate-200">
                    <span>Subtotal</span>
                    <span className="font-mono">{formatPrice(cartSubtotal, currency)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Payment badge notice */}
            {orderMode === 'DELIVERY' && !isRazorpayActive && (
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl text-xs text-emerald-800 flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>This order will be processed as <strong>Cash on Delivery</strong>.</span>
              </div>
            )}

            <button
              onClick={handleCheckout}
              disabled={isSubmitting || cartItems.length === 0}
              className="w-full py-3.5 bg-slate-950 hover:bg-slate-800 text-white font-extrabold text-xs rounded-2xl transition shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader className="w-4 h-4 animate-spin text-amber-500" /> : (
                <>
                  <span>Place {orderMode === 'TAKEAWAY' ? 'Takeaway' : 'Delivery'} Order</span>
                  <ChevronRight className="w-4 h-4 text-amber-400" />
                </>
              )}
            </button>
          </div>
        )}

        {/* ==================== CONFIRMATION TAB ==================== */}
        {activeTab === 'confirmation' && (
          <div className="bg-white p-8 rounded-3xl border border-slate-150 shadow-sm text-center space-y-4">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto animate-bounce" />
            <h2 className="text-2xl font-bold font-display text-slate-900">Order Confirmed!</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Your {orderMode.toLowerCase()} order has been placed successfully and sent to the kitchen.
            </p>
            <button
              onClick={() => {
                setActiveTab('menu');
              }}
              className="px-6 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl"
            >
              Place Another Order
            </button>
          </div>
        )}
      </div>

      {/* Floating Bottom Cart Bar */}
      {activeTab === 'menu' && cartItems.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 max-w-xl mx-auto z-40">
          <button
            onClick={() => setActiveTab('cart')}
            className="w-full bg-slate-950 hover:bg-slate-900 text-white p-4 rounded-2xl shadow-xl flex items-center justify-between font-bold text-xs"
          >
            <div className="flex items-center gap-2">
              <span className="bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full font-mono">{cartItems.length}</span>
              <span>View Basket & Checkout</span>
            </div>
            <span className="font-mono text-amber-400 text-sm">{formatPrice(cartSubtotal, currency)}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default PublicSessionlessOrder;
