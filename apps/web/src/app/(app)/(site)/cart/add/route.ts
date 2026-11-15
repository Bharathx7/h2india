import { isEnabled } from "@h2india/config";
import { cartProductId, addToCart, OtherSupplierInCart, OrderError } from "@h2india/core/orders";
import { redirect } from "next/navigation";
import { cartBuyer } from "@/cart/session";

// GET /cart/add?product=<slug>[&buy=1][&replace=1] (the product page's Add to cart and Buy now, step 10.2). Signed-out
// people sign in first and come back here. Another supplier's items ask before they're replaced (/cart?other=…).
export async function GET(request: Request) {
  if (!isEnabled("transactions")) return new Response(null, { status: 404 });
  const url = new URL(request.url);
  const slug = url.searchParams.get("product") ?? "";
  const buy = url.searchParams.get("buy") === "1";
  const me = await cartBuyer();
  if (!me) redirect(`/sign-in?next=${encodeURIComponent(`/cart/add?product=${slug}${buy ? "&buy=1" : ""}`)}`);
  const product = await cartProductId(me.db, slug);
  if (!product) redirect("/cart");
  try {
    await addToCart(me.db, me.actor, me.buyer.organisationId, {
      productId: product.id,
      quantity: product.minOrder,
      replace: url.searchParams.get("replace") === "1" || buy,
    });
  } catch (error) {
    if (error instanceof OtherSupplierInCart)
      redirect(`/cart?other=${encodeURIComponent(error.supplierName)}&product=${encodeURIComponent(slug)}`);
    if (error instanceof OrderError) redirect(`/cart?problem=${encodeURIComponent(error.message)}`);
    throw error;
  }
  redirect(buy ? "/checkout" : "/cart");
}
