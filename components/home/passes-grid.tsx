"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { isFlashSaleActive } from "@/lib/flow";

type PassTier = {
  name: string;
  people: string;
  price: number;
  perHead: number;
  save: number;
  featured?: boolean;
};

const REGULAR_PASSES: PassTier[] = [
  { name: "1 Pass", people: "Just you", price: 499, perHead: 499, save: 0 },
  { name: "2 Passes", people: "You + a friend", price: 899, perHead: 450, save: 99, featured: true },
  { name: "4 Passes", people: "Bring the squad", price: 1599, perHead: 400, save: 397 },
];

const FLASH_SALE_PASSES: PassTier[] = [
  { name: "1 Pass", people: "Just you", price: 449, perHead: 449, save: 0 },
  { name: "2 Passes", people: "You + a friend", price: 799, perHead: 400, save: 99, featured: true },
  { name: "4 Passes", people: "Bring the squad", price: 1399, perHead: 350, save: 397 },
];

export function PassesGrid() {
  const [isFlashSale, setIsFlashSale] = useState(() => isFlashSaleActive());

  useEffect(() => {
    const sync = () => {
      const active = isFlashSaleActive();
      setIsFlashSale((prev) => (prev !== active ? active : prev));
    };
    sync();
    const timer = window.setInterval(sync, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const passes = isFlashSale ? FLASH_SALE_PASSES : REGULAR_PASSES;

  return (
    <div className="hp-passes">
      {passes.map((p) => (
        <Link
          key={p.name}
          href="/bcon"
          className={`hp-pass ${p.featured ? "hp-pass-featured" : ""}`}
          id={`hp-pass-${p.price}`}
          data-spot
        >
          {p.featured ? <span className="hp-pass-badge">Best for pairs</span> : null}
          <span className="hp-pass-name">{p.name}</span>
          <span className="hp-pass-people">{p.people}</span>
          <span className="hp-pass-price">
            <small>₹</small>
            {p.price.toLocaleString("en-IN")}
          </span>
          <span className="hp-pass-per">
            {p.save > 0 ? <>≈ ₹{p.perHead} per person · <b>save ₹{p.save}</b></> : <>Standard access</>}
          </span>
          <span className="hp-pass-cta">
            Choose {p.name.toLowerCase()} <span aria-hidden="true">→</span>
          </span>
        </Link>
      ))}
    </div>
  );
}

