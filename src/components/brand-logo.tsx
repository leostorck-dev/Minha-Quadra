import Image from "next/image";
import Link from "next/link";

export function BrandLogo({
  priority = false,
  className = "",
}: {
  priority?: boolean;
  className?: string;
}) {
  return (
    <Link
      href="/"
      aria-label="Minha Quadra, início"
      className={`inline-flex items-center ${className}`}
    >
      <Image
        src="/minha-quadra-logo-horizontal.png"
        alt="Minha Quadra"
        width={240}
        height={80}
        priority={priority}
        className="h-auto w-full"
      />
    </Link>
  );
}
