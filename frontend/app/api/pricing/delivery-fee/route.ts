import { NextResponse } from "next/server";
import { getDeliveryFee } from "@/lib/pricing/deliveryFee";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const subtotalParam = searchParams.get("subtotal");

  if (!subtotalParam) {
    return NextResponse.json(
      { error: "Missing subtotal" },
      { status: 400 }
    );
  }

  const subtotal = Number(subtotalParam);

  if (Number.isNaN(subtotal) || subtotal < 0) {
    return NextResponse.json(
      { error: "Invalid subtotal" },
      { status: 400 }
    );
  }

  const fee = await getDeliveryFee(subtotal);

  return NextResponse.json({ fee });
}
