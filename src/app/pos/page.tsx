"use client";

import Link from "next/link";
import { useState } from "react";

const productGroups = [
  {
    title: "Admissions",
    items: [
      { id: "open-play", name: "Open Play Admission", price: 12, type: "Admission" },
      { id: "toddler-time", name: "Toddler Time", price: 8, type: "Admission" },
      { id: "extra-child", name: "Additional Child", price: 10, type: "Admission" },
      { id: "adult-pass", name: "Adult Admission", price: 0, type: "Admission" },
    ],
  },
  {
    title: "Memberships",
    items: [
      { id: "monthly", name: "Monthly Unlimited", price: 49.99, type: "Membership" },
      { id: "summer", name: "Summer Unlimited", price: 99, type: "Membership" },
      { id: "annual", name: "Annual Membership", price: 399, type: "Membership" },
    ],
  },
  {
    title: "Snacks & Retail",
    items: [
      { id: "water", name: "Bottled Water", price: 2, type: "Snack" },
      { id: "juice", name: "Juice Box", price: 2.5, type: "Snack" },
      { id: "chips", name: "Chips", price: 1.75, type: "Snack" },
      { id: "socks", name: "Grip Socks", price: 4, type: "Retail" },
    ],
  },
  {
    title: "Gift Cards",
    items: [
      { id: "gift-card-25", name: "$25 Gift Card", price: 25, type: "Gift Card" },
      { id: "gift-card-50", name: "$50 Gift Card", price: 50, type: "Gift Card" },
      { id: "gift-card-100", name: "$100 Gift Card", price: 100, type: "Gift Card" },
    ],
  },
];

type CartItem = {
  id: string;
  name: string;
  type: string;
  price: number;
  quantity: number;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export default function POSPage() {
  const [cart, setCart] = useState<CartItem[]>([
    {
      id: "open-play",
      name: "Open Play Admission",
      type: "Admission",
      price: 12,
      quantity: 2,
    },
  ]);
  const [activeCategory, setActiveCategory] = useState("Admissions");
  const [isKeypadOpen, setIsKeypadOpen] = useState(false);
  const [customDescription, setCustomDescription] = useState("Custom Charge");
  const [keypadValue, setKeypadValue] = useState("");

  const subtotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);
  const tax = 0;
  const total = subtotal + tax;

  function addItem(item: { id: string; name: string; price: number; type: string }) {
    setCart((currentCart) => {
      const existing = currentCart.find((cartItem) => cartItem.id === item.id);

      if (existing) {
        return currentCart.map((cartItem) =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      }

      return [
        ...currentCart,
        {
          id: item.id,
          name: item.name,
          type: item.type,
          price: item.price,
          quantity: 1,
        },
      ];
    });
  }

  function removeItem(id: string) {
    setCart((currentCart) => currentCart.filter((item) => item.id !== id));
  }

  function updateQuantity(id: string, direction: "up" | "down") {
    setCart((currentCart) =>
      currentCart
        .map((item) => {
          if (item.id !== id) {
            return item;
          }

          const nextQuantity =
            direction === "up" ? item.quantity + 1 : item.quantity - 1;

          return {
            ...item,
            quantity: nextQuantity,
          };
        })
        .filter((item) => item.quantity > 0)
    );
  }

  function pressKey(value: string) {
    if (value === "back") {
      setKeypadValue((current) => current.slice(0, -1));
      return;
    }

    if (value === "." && keypadValue.includes(".")) {
      return;
    }

    setKeypadValue((current) => `${current}${value}`);
  }

  function addCustomCharge() {
    const amount = Number(keypadValue || 0);

    if (!amount || amount <= 0) {
      return;
    }

    setCart((currentCart) => [
      ...currentCart,
      {
        id: `custom-${Date.now()}`,
        name: customDescription || "Custom Charge",
        type: "Custom",
        price: amount,
        quantity: 1,
      },
    ]);

    setKeypadValue("");
    setCustomDescription("Custom Charge");
    setIsKeypadOpen(false);
  }

  return (
    <main className="h-screen overflow-hidden bg-[#E7E3DA] p-5 text-[#202633] antialiased">
      <div className="flex h-full overflow-hidden rounded-[18px] bg-[#F6F0E6] shadow-sm">
        <aside className="relative h-full w-[260px] shrink-0 border-r border-black/10 bg-[#F2EFE8] px-6 py-7">
          <div className="mb-9">
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#1E293B] text-sm font-semibold text-white">
                PF
              </div>
              <div>
                <h1 className="text-lg font-semibold tracking-[-0.03em]">PlayFlow</h1>
                <p className="text-xs text-[#6B7280]">Palmetto Playhouse</p>
              </div>
            </div>
          </div>

          <nav className="space-y-1">
            {[
  { label: "Dashboard", icon: "▣", href: "/" },
  { label: "Check-In", icon: "✓", href: "/check-in" },
  { label: "Calendar", icon: "◷", href: "/calendar" },
  { label: "Party & Events", icon: "★", href: "/parties" },
  { label: "POS", icon: "$", href: "/pos" },
  { label: "Reports", icon: "▥", href: "/reports" },
  { label: "Company Settings", icon: "⚙", href: "/company-settings" },
].map((item) => {
              const isActive = item.href === "/pos";

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex w-full items-center gap-4 rounded-[8px] px-4 py-3 text-left text-sm font-semibold transition ${
                    isActive
                      ? "bg-white text-[#111827] shadow-sm"
                      : "text-[#5B6270] hover:bg-white/70 hover:text-[#111827]"
                  }`}
                >
                  <span className="flex h-5 w-5 items-center justify-center text-base">
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="absolute bottom-7 left-6 right-6">
            <button className="flex w-full items-center gap-4 rounded-[8px] px-4 py-3 text-sm font-medium text-[#5B6270] hover:bg-white/70 hover:text-[#111827]">
              <span>↪</span>
              <span>Log Out</span>
            </button>
          </div>
        </aside>

        <section className="h-full flex-1 overflow-hidden px-6 py-6">
          <header className="mb-5 flex items-start justify-between gap-5">
            <div>
              <p className="text-sm font-semibold text-[#8A6D3B]">Point of Sale</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-[#1E293B]">
                POS
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <button
                title="Notifications"
                className="relative flex h-10 w-10 items-center justify-center rounded-[10px] bg-white text-[#1E293B] shadow-sm transition hover:bg-[#FAFAFA]"
              >
                <span className="text-lg leading-none">🔔</span>
                <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500" />
              </button>

              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFD56B] text-md font-semibold text-[#1E293B]">
                  D
                </div>
                <span className="text-sm font-medium text-[#1E293B]">Devin</span>
              </div>
            </div>
          </header>

          <div className="grid h-[calc(100vh-125px)] grid-cols-[1fr_390px] gap-3">
            <section className="overflow-hidden rounded-[12px] border border-black/10 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-black/10 p-4">
                <div>
                  <p className="text-sm font-semibold text-[#6B7280]">
                    Products & Services
                  </p>
                  <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[#1E293B]">
                    General Checkout
                  </h2>
                </div>

                <button
                  onClick={() => setIsKeypadOpen(true)}
                  className="rounded-[10px] bg-[#1E293B] px-4 py-3 text-sm font-semibold text-white"
                >
                  + Custom Charge
                </button>
              </div>

              <div className="h-full overflow-y-auto p-4 pb-24">
                <div className="mb-4 rounded-[12px] border border-black/10 bg-[#F6F0E6] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#6B7280]">
                    General Checkout
                  </p>
                  <div className="mt-3 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold text-[#1E293B]">
                        Select a category to add items to the cart
                      </p>
                      <p className="mt-1 text-sm text-[#6B7280]">
                        Party balances and party-specific add-ons will be handled from Party & Events.
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#1E293B]">
                      General Sale
                    </span>
                  </div>
                </div>

                <div className="mb-4 flex flex-wrap gap-2">
                  {productGroups.map((group) => (
                    <button
                      key={group.title}
                      onClick={() => setActiveCategory(group.title)}
                      className={`rounded-[8px] px-4 py-2 text-sm font-semibold ${
                        activeCategory === group.title
                          ? "bg-[#1E293B] text-white"
                          : "bg-[#F6F0E6] text-[#5B6270]"
                      }`}
                    >
                      {group.title}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-4 gap-3">
                  {productGroups
                    .find((group) => group.title === activeCategory)
                    ?.items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => addItem(item)}
                        className="min-h-[96px] rounded-[10px] border border-black/10 bg-[#F6F0E6] p-3 text-left transition hover:bg-[#EFE8DC]"
                      >
                        <p className="text-sm font-semibold text-[#1E293B]">
                          {item.name}
                        </p>
                        <p className="mt-1 text-xs text-[#6B7280]">{item.type}</p>
                        <p className="mt-3 text-lg font-semibold text-[#1E293B]">
                          {formatCurrency(item.price)}
                        </p>
                      </button>
                    ))}
                </div>
              </div>
            </section>

            <aside className="overflow-hidden rounded-[12px] border border-black/10 bg-white shadow-sm">
              <div className="border-b border-black/10 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#1E293B]">Checkout</p>
                    <p className="mt-1 text-xs text-[#6B7280]">Order ID: #PF0030</p>
                  </div>

                  <button
                    onClick={() => setCart([])}
                    className="rounded-[8px] bg-[#F6F0E6] px-3 py-2 text-xs font-semibold text-[#1E293B]"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="flex h-full flex-col">
                <div className="flex-1 overflow-y-auto px-4 py-4">
                  <p className="mb-3 text-sm font-semibold text-[#1E293B]">
                    Ordered Items
                  </p>

                  {cart.length > 0 ? (
                    <div className="space-y-3">
                      {cart.map((item) => (
                        <div key={item.id} className="group">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-[#6B7280]">
                                  {item.quantity}x
                                </span>
                                <p className="truncate text-sm font-semibold text-[#1E293B]">
                                  {item.name}
                                </p>
                              </div>
                              <p className="mt-1 text-xs text-[#6B7280]">{item.type}</p>
                            </div>

                            <p className="shrink-0 text-sm font-semibold text-[#1E293B]">
                              {formatCurrency(item.price * item.quantity)}
                            </p>
                          </div>

                          <div className="mt-2 flex items-center justify-between">
                            <div className="flex items-center overflow-hidden rounded-[7px] border border-black/10 bg-[#F6F0E6]">
                              <button
                                onClick={() => updateQuantity(item.id, "down")}
                                className="px-2.5 py-1.5 text-xs font-semibold"
                              >
                                −
                              </button>
                              <span className="border-x border-black/10 px-2.5 py-1.5 text-xs font-semibold">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.id, "up")}
                                className="px-2.5 py-1.5 text-xs font-semibold"
                              >
                                +
                              </button>
                            </div>

                            <button
                              onClick={() => removeItem(item.id)}
                              className="text-xs font-semibold text-[#9F1239]"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[10px] border border-dashed border-black/20 bg-[#F6F0E6] p-6 text-center">
                      <p className="font-semibold text-[#1E293B]">Cart is empty</p>
                      <p className="mt-2 text-sm text-[#6B7280]">
                        Tap a product or service to add it here.
                      </p>
                    </div>
                  )}
                </div>

                <div className="px-4 pb-8 pt-4">
                  <div className="border-t border-black/10 pt-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-[#6B7280]">Subtotal</span>
                        <span className="font-semibold">{formatCurrency(subtotal)}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[#6B7280]">Tax</span>
                        <span className="font-semibold">{formatCurrency(tax)}</span>
                      </div>

                      <div className="flex items-center justify-between border-t border-black/10 pt-4">
                        <span className="text-base font-semibold text-[#1E293B]">
                          Total Payable
                        </span>
                        <span className="text-2xl font-semibold tracking-[-0.05em] text-[#1E293B]">
                          {formatCurrency(total)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-5">
                      <p className="mb-3 text-sm font-semibold text-[#1E293B]">
                        Payment Method
                      </p>

                      <div className="grid grid-cols-3 gap-2">
                        <button className="rounded-[10px] border border-[#7BAE7F] bg-[#E9F8EC] px-3 py-4 text-center text-sm font-semibold text-[#245B35]">
                          <span className="block text-lg">💵</span>
                          Cash
                        </button>

                        <button className="rounded-[10px] border border-[#38BDF8] bg-[#EAF8FF] px-3 py-4 text-center text-sm font-semibold text-[#0369A1]">
                          <span className="block text-lg">💳</span>
                          Card
                        </button>

                        <button className="rounded-[10px] border border-[#B99AFF] bg-[#EEE7FF] px-3 py-4 text-center text-sm font-semibold text-[#5B21B6]">
                          <span className="block text-lg">⇄</span>
                          Split
                        </button>
                      </div>
                    </div>

                    <button className="mt-5 w-full rounded-[10px] bg-[#20B8A8] px-4 py-4 text-sm font-semibold text-white shadow-sm">
                      Process Payment
                    </button>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </div>

      {isKeypadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-5">
          <div className="w-full max-w-[430px] rounded-[18px] bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#8A6D3B]">
                  Custom Amount
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-[#1E293B]">
                  Add Custom Charge
                </h2>
              </div>

              <button
                onClick={() => setIsKeypadOpen(false)}
                className="rounded-[8px] bg-[#F6F0E6] px-3 py-2 text-sm font-semibold"
              >
                Close
              </button>
            </div>

            <label className="text-xs font-semibold uppercase tracking-[0.08em] text-[#6B7280]">
              Description
            </label>
            <input
              value={customDescription}
              onChange={(event) => setCustomDescription(event.target.value)}
              className="mt-2 w-full rounded-[10px] border border-black/10 bg-[#F6F0E6] px-4 py-3 text-sm outline-none"
              placeholder="Custom Charge"
            />

            <div className="my-5 rounded-[12px] bg-[#F6F0E6] p-5 text-center">
              <p className="text-sm font-semibold text-[#6B7280]">Amount</p>
              <p className="mt-2 text-4xl font-semibold tracking-[-0.06em] text-[#1E293B]">
                {formatCurrency(Number(keypadValue || 0))}
              </p>
            </div>

            <div className="mb-4 grid grid-cols-5 gap-2">
              {[5, 10, 20, 50, 100].map((amount) => (
                <button
                  key={amount}
                  onClick={() => setKeypadValue(String(amount))}
                  className="rounded-[10px] bg-[#F6F0E6] px-3 py-3 text-sm font-semibold"
                >
                  ${amount}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "back"].map((key) => (
                <button
                  key={key}
                  onClick={() => pressKey(key)}
                  className="rounded-[12px] bg-[#1E293B] px-4 py-5 text-xl font-semibold text-white transition hover:bg-[#334155]"
                >
                  {key === "back" ? "←" : key}
                </button>
              ))}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                onClick={() => setIsKeypadOpen(false)}
                className="rounded-[10px] border border-black/10 bg-white px-4 py-4 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={addCustomCharge}
                className="rounded-[10px] bg-[#7BAE7F] px-4 py-4 text-sm font-semibold text-white"
              >
                Add To Cart
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
