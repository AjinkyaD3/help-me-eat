import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-16 text-center">
      <p className="text-lg font-semibold">Page not found</p>
      <Link href="/" className="mt-3 inline-block font-semibold text-leaf">Back to Spin</Link>
    </div>
  );
}
