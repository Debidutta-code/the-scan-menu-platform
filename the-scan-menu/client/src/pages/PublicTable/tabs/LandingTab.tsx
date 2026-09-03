import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  User as UserIcon,
  Clock,
  ChevronRight,
  MapPin,
  Phone,
  CreditCard,
  Zap,
  ShieldCheck,
  Star,
  MessageSquare,
} from 'lucide-react';
import { LandingTabProps } from '../types';

const mockReviews = [
  { author: 'Rahul Sharma', text: 'Incredibly fast checkout and the sourdough pizzas are to die for! Madras coffee on tap is spectacular.', rating: 5 },
  { author: 'Neha Gupta', text: 'Brilliant QR menu design. Tapping Call Waiter brings tissues in seconds. Exceptional service.', rating: 5 },
  { author: 'David K.', text: 'A clean, modern platform. Love the veggie filters and modifier options on sliders.', rating: 5 },
];

export const LandingTab: React.FC<LandingTabProps> = ({
  restaurant,
  table,
  activeOrderCount,
  activeOrdersIds,
  isCustomerAuthenticated,
  customer,
  customerOtpEnabled = false,
  restaurantSlug,
  rawCategories,
  onExploreMenu,
  onTrackOrders,
  onCategoryJump,
}) => {
  return (
    <motion.div
      key="landing"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Cover Header */}
      <div className="relative w-full h-64 overflow-hidden bg-slate-900 text-white flex flex-col justify-end p-6">
        {restaurant.coverImageUrl && (
          <img
            src={restaurant.coverImageUrl}
            alt={restaurant.name}
            className="absolute inset-0 w-full h-full object-cover opacity-45"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/30 to-transparent" />

        <div className="relative flex items-center gap-4">
          {restaurant.logoUrl ? (
            <img
              src={restaurant.logoUrl}
              alt={restaurant.name}
              className="w-16 h-16 object-contain rounded-2xl bg-white p-1 shadow"
            />
          ) : (
            <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center font-bold font-display text-3xl text-slate-950 shadow">
              {restaurant.name.charAt(0)}
            </div>
          )}
          <div>
            <h1 className="font-display tracking-tight text-3xl font-semibold leading-tight">
              {restaurant.name}
            </h1>
            <p className="text-xs text-amber-400 font-semibold flex items-center gap-1.5 mt-0.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Open for dine-in & checkout</span>
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 space-y-6 pb-6">
        {/* Diner Profile & Sign In Banner (Only shown when customer OTP verification is enabled) */}
        {customerOtpEnabled && (() => {
          const loyaltyActive = Boolean(restaurant?.loyaltyConfig?.enabled !== false);
          return (
            <div className="bg-white rounded-3xl p-4 border border-slate-150 shadow-xs flex items-center justify-between gap-3 animate-fade-in">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 flex items-center justify-center font-bold font-display text-sm shrink-0 shadow-xs">
                  {isCustomerAuthenticated && customer?.name ? customer.name.charAt(0).toUpperCase() : <UserIcon className="w-5 h-5 text-slate-900" strokeWidth={1.75} />}
                </div>
                <div className="text-left min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-bold text-slate-900 truncate">
                      {isCustomerAuthenticated && customer?.name ? customer.name : 'Diner Account'}
                    </h4>
                    {isCustomerAuthenticated && loyaltyActive && (
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-200 shrink-0">
                        ⭐ {customer?.tier || 'BRONZE'}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                    {isCustomerAuthenticated
                      ? loyaltyActive
                        ? `${customer?.loyaltyPoints || 0} Pts (Worth ₹${(((customer?.loyaltyPoints || 0) * (restaurant?.loyaltyConfig?.pointValuePaise || 50)) / 10000).toFixed(0)})`
                        : (customer?.phone || 'Verified Diner')
                      : loyaltyActive
                        ? 'Sign in to earn points & view order history'
                        : 'Sign in to track orders & view history'}
                  </p>
                </div>
              </div>
              <Link
                to={isCustomerAuthenticated ? (restaurantSlug ? `/r/${restaurantSlug}/portal?from=${encodeURIComponent(window.location.pathname + window.location.search)}` : `/customer-portal?from=${encodeURIComponent(window.location.pathname + window.location.search)}`) : (restaurantSlug ? `/r/${restaurantSlug}/login?returnUrl=${encodeURIComponent(window.location.pathname + window.location.search)}` : '/customer-login')}
                className="px-3.5 py-2 bg-slate-950 hover:bg-slate-800 text-white text-[11px] font-bold rounded-xl transition shadow-xs shrink-0 active:scale-95"
              >
                {isCustomerAuthenticated ? 'Dashboard' : 'Sign In'}
              </Link>
            </div>
          );
        })()}

        {/* Active Table spot info */}
        <div className="bg-white rounded-3xl p-5 border border-slate-150 shadow-sm space-y-3 animate-fade-in">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block font-mono">
                Dining Station
              </span>
              <h3 className="font-bold text-lg text-slate-900 leading-tight mt-0.5">{table.displayName}</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                {activeOrderCount > 0
                  ? `Active table session • ${activeOrderCount} round${activeOrderCount > 1 ? 's' : ''} in progress`
                  : 'Ready for your order'}
              </p>
            </div>
            <span className="h-10 w-10 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 font-bold font-mono text-sm border border-amber-100">
              #{table.tableNumber}
            </span>
          </div>
        </div>

        {/* Track Orders Banner */}
        {activeOrderCount > 0 && (
          <div className="bg-amber-50 border border-amber-200/65 rounded-3xl p-5 flex items-center justify-between shadow-sm animate-fade-in gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 shrink-0">
                <Clock className="w-5 h-5 animate-pulse" strokeWidth={1.75} />
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-900">Track Placed Orders</h4>
                <p className="text-[10px] text-slate-500 font-medium">You have {activeOrderCount} order{activeOrderCount > 1 ? 's' : ''} placed at this table.</p>
              </div>
            </div>
            <button
              onClick={() => {
                onTrackOrders(activeOrdersIds[activeOrdersIds.length - 1]);
              }}
              className="px-3.5 py-2 bg-slate-950 hover:bg-slate-900 text-white font-extrabold text-[10px] rounded-xl flex items-center gap-1 transition shadow-sm shrink-0 whitespace-nowrap"
            >
              <span>Track Status</span>
              <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.5} />
            </button>
          </div>
        )}

        {/* Prompt CTA to explore */}
        <button
          onClick={onExploreMenu}
          className="w-full py-4 bg-slate-950 hover:bg-slate-800 text-white font-extrabold text-sm rounded-2xl transition flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-[0.99]"
        >
          <span>Explore Menu & Order</span>
          <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
        </button>

        {/* Description */}
        <div className="bg-white rounded-3xl p-5 border border-slate-150 shadow-sm space-y-2">
          <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest block font-mono border-b border-slate-50 pb-1.5">
            About Restaurant
          </h4>
          <p className="text-xs text-slate-600 leading-relaxed font-sans pt-1">
            {restaurant.description || 'Welcome to Demo Cafe! We serve gourmet delicacies, refreshing tonics, and hot baked furnace sourdoughs.'}
          </p>
        </div>

        {/* Operational Info */}
        <div className="bg-white rounded-3xl p-5 border border-slate-150 shadow-sm space-y-4">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block font-mono border-b border-slate-50 pb-2">
            Dine-In Information
          </span>
          <div className="space-y-3.5 text-xs text-slate-600">
            {restaurant.timings && (
              <div className="flex items-center gap-3">
                <Clock className="w-4.5 h-4.5 text-slate-400 shrink-0" strokeWidth={1.75} />
                <span>Dine-In Hours: <strong className="text-slate-800">{restaurant.timings.open} - {restaurant.timings.close}</strong></span>
              </div>
            )}
            {restaurant.address && (
              <div className="flex items-start gap-3">
                <MapPin className="w-4.5 h-4.5 text-slate-400 shrink-0 mt-0.5" strokeWidth={1.75} />
                <span className="leading-relaxed">Address: <strong className="text-slate-800">{restaurant.address}</strong></span>
              </div>
            )}
            {restaurant.phone && (
              <div className="flex items-center gap-3">
                <Phone className="w-4.5 h-4.5 text-slate-400 shrink-0" strokeWidth={1.75} />
                <span>Contact Service: <strong className="text-slate-800">{restaurant.phone}</strong></span>
              </div>
            )}
          </div>
        </div>

        {/* Payment Methods */}
        {restaurant.paymentMethods && (
          <div className="bg-white rounded-3xl p-5 border border-slate-150 shadow-sm space-y-3.5">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block font-mono border-b border-slate-50 pb-2">
              Supported Payments
            </span>
            <div className="flex flex-wrap gap-2 pt-1">
              {restaurant.paymentMethods.cash && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-100">
                  <CreditCard className="w-3.5 h-3.5" strokeWidth={1.75} />
                  Cash
                </span>
              )}
              {restaurant.paymentMethods.card && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-indigo-50 text-indigo-800 border border-indigo-100">
                  <CreditCard className="w-3.5 h-3.5" strokeWidth={1.75} />
                  Cards
                </span>
              )}
              {restaurant.paymentMethods.upi && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-100">
                  <Zap className="w-3.5 h-3.5 text-sky-600" strokeWidth={1.75} />
                  UPI
                </span>
              )}
              {restaurant.paymentMethods.razorpay && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-100">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600" strokeWidth={1.75} />
                  Razorpay
                </span>
              )}
            </div>
          </div>
        )}

        {/* Quick Gourmet Jumps */}
        {rawCategories.length > 0 && (
          <div className="bg-white rounded-3xl p-5 border border-slate-150 shadow-sm space-y-3.5">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block font-mono border-b border-slate-50 pb-2">
              Popular Categories
            </span>
            <div className="grid grid-cols-2 gap-2 pt-1">
              {rawCategories.slice(0, 4).map((cat) => (
                <button
                  key={cat._id}
                  onClick={() => onCategoryJump(cat._id)}
                  className="p-3 text-left bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-150 flex items-center justify-between transition-colors group"
                >
                  <span className="font-bold text-xs text-slate-700 truncate">{cat.name}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-colors" strokeWidth={2.5} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Reviews Section */}
        <div className="space-y-4 border-t border-slate-200/60 pt-6">
          <div className="text-center space-y-1">
            <h3 className="font-display text-2xl font-normal text-slate-900">What Our Guests Say</h3>
            <p className="text-xs text-slate-500">Verified platform testimonials from our guests.</p>
          </div>

          {/* Ratings Overview Card */}
          <div className="bg-white rounded-3xl p-5 border border-slate-150 shadow-sm space-y-4">
            <div className="flex items-center gap-4">
              <div className="text-center bg-amber-50/50 border border-amber-100 p-4 rounded-2xl shrink-0">
                <span className="text-3xl font-black text-slate-900 block font-mono leading-none">4.9</span>
                <div className="flex gap-0.5 text-amber-500 justify-center mt-1.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="w-3 h-3 fill-current" strokeWidth={1.5} />
                  ))}
                </div>
                <span className="text-[9px] text-slate-400 font-semibold block mt-1 font-mono">148 reviews</span>
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="w-2 font-bold font-mono text-slate-400">5</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: '92%' }} />
                  </div>
                  <span className="w-6 text-right font-bold text-slate-400 font-mono">92%</span>
                </div>
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="w-2 font-bold font-mono text-slate-400">4</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: '6%' }} />
                  </div>
                  <span className="w-6 text-right font-bold text-slate-400 font-mono">6%</span>
                </div>
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="w-2 font-bold font-mono text-slate-400">3</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: '2%' }} />
                  </div>
                  <span className="w-6 text-right font-bold text-slate-400 font-mono">2%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Testimonials Carousel */}
          <div className="w-full overflow-hidden">
            <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none gap-4 pb-4 px-1 pt-1">
              {mockReviews.map((rev, idx) => {
                const colors = [
                  'bg-amber-100 text-amber-800',
                  'bg-indigo-100 text-indigo-800',
                  'bg-emerald-100 text-emerald-800',
                  'bg-rose-100 text-rose-800',
                ];
                const avatarColor = colors[idx % colors.length];
                return (
                  <div
                    key={idx}
                    className="snap-center shrink-0 w-[85%] bg-white rounded-3xl p-5 border border-slate-150 shadow-sm space-y-3.5"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${avatarColor}`}>
                        {rev.author.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-slate-900 text-xs block truncate">{rev.author}</span>
                        <div className="flex gap-0.5 text-amber-500 mt-0.5">
                          {Array.from({ length: rev.rating }).map((_, i) => (
                            <Star key={i} className="w-3 h-3 fill-current" strokeWidth={1.5} />
                          ))}
                        </div>
                      </div>
                    </div>
                    <p className="text-slate-600 text-xs leading-relaxed italic font-sans min-h-[48px]">
                      "{rev.text}"
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Google Review Link */}
          <a
            href={restaurant.googleReviewUrl || `https://www.google.com/search?q=${encodeURIComponent(restaurant.name + ' reviews')}`}
            target="_blank"
            rel="noreferrer"
            className="w-full py-4 bg-white border-2 border-slate-950 text-slate-950 hover:bg-slate-50 font-extrabold text-sm rounded-2xl transition flex items-center justify-center gap-2 shadow-sm text-center"
          >
            <MessageSquare className="w-5 h-5 text-amber-500 fill-current" strokeWidth={1.75} />
            <span>Submit Google Review</span>
          </a>
        </div>
      </div>
    </motion.div>
  );
};
