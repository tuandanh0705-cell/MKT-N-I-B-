import Image from "next/image";
import type { DepartmentScope } from "@/generated/prisma/client";
import type { PirateCharacterId } from "@/lib/pirate-3d-builder";

/** Chiếc mũ rơm chibi dễ thương làm biểu tượng chính của băng */
export function StrawHatLogo({ className = "w-9 h-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      <ellipse cx="32" cy="41" rx="26" ry="7.5" fill="#FBBF24" stroke="#78350F" strokeWidth="2.8" />
      <path
        d="M15 39C15 24 22 16 32 16C42 16 49 24 49 39H15Z"
        fill="#FDE047"
        stroke="#78350F"
        strokeWidth="2.8"
      />
      <path
        d="M15.5 33.5C24 35.5 40 35.5 48.5 33.5V39C40 41 24 41 15.5 39V33.5Z"
        fill="#EF4444"
        stroke="#991B1B"
        strokeWidth="2.2"
      />
      <circle cx="27" cy="26" r="1.8" fill="#78350F" />
      <circle cx="37" cy="26" r="1.8" fill="#78350F" />
      <path
        d="M29 29.5C30.5 31.2 33.5 31.2 35 29.5"
        stroke="#78350F"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="24" cy="28" r="2" fill="#FB7185" fillOpacity="0.45" />
      <circle cx="40" cy="28" r="2" fill="#FB7185" fillOpacity="0.45" />
    </svg>
  );
}

/** Ốc sên truyền tin Den Den Mushi cute dùng cho thông báo & cảnh báo */
export function DenDenMushiIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <path
        d="M10 35C10 31.5 13 29 17 29H33C37 29 40 31.5 40 35C40 37.5 37.5 39 34 39H15C11.8 39 10 37.2 10 35Z"
        fill="#FDE68A"
        stroke="#78350F"
        strokeWidth="2.2"
      />
      <circle cx="21" cy="23" r="10.5" fill="#F472B6" stroke="#831843" strokeWidth="2.2" />
      <path
        d="M21 23C21 20.5 23 19 25 19C27.5 19 29 21 29 23.5C29 26.5 26 28.5 22.5 28.5C18.5 28.5 16 25.5 16 21.5"
        stroke="#FDF2F8"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <line x1="33" y1="29" x2="32" y2="20" stroke="#78350F" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="37" y1="30" x2="39" y2="21" stroke="#78350F" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="32" cy="18.5" r="3" fill="#FFFFFF" stroke="#78350F" strokeWidth="2" />
      <circle cx="39" cy="19.5" r="3" fill="#FFFFFF" stroke="#78350F" strokeWidth="2" />
      <circle cx="32.2" cy="18.5" r="1.2" fill="#0F172A" />
      <circle cx="39.2" cy="19.5" r="1.2" fill="#0F172A" />
    </svg>
  );
}

/** Tàu Sunny chibi đang lướt sóng (hiển thị ở màn Login & Header vui tươi) */
export function SunnyShipIllustration({ className = "w-full max-w-xs" }: { className?: string }) {
  return (
    <svg viewBox="0 0 300 180" fill="none" className={className} aria-hidden="true">
      {/* Mặt trời nhỏ */}
      <circle cx="248" cy="36" r="20" fill="#FDE047" />
      <circle cx="248" cy="36" r="26" fill="#FDE047" fillOpacity="0.25" />

      {/* Mây hoạt hình */}
      <path d="M35 45C35 39 40 35 46 35C48 31 53 29 58 31C62 29 68 32 69 37C74 38 77 42 76 47H35V45Z" fill="#FFFFFF" fillOpacity="0.9" />
      <path d="M178 28C178 24 182 21 186 21C188 18 192 17 196 19C199 17 204 20 205 24C209 25 211 28 210 32H178V28Z" fill="#FFFFFF" fillOpacity="0.85" />

      {/* Cột buồm & Cánh buồm Mũ Rơm */}
      <rect x="143" y="28" width="7" height="86" rx="3.5" fill="#92400E" />
      {/* Cờ hải tặc nhỏ trên đỉnh */}
      <path d="M150 28L182 35L150 43V28Z" fill="#0F172A" />
      <circle cx="161" cy="35.5" r="4" fill="#FDE047" />

      {/* Cánh buồm trắng viền đỏ */}
      <path
        d="M96 46C122 40 172 40 198 46C192 72 192 90 198 106C166 100 128 100 96 106C104 86 104 66 96 46Z"
        fill="#FFFFFF"
        stroke="#0F172A"
        strokeWidth="3"
      />
      {/* Mũ rơm biểu tượng trên buồm */}
      <ellipse cx="147" cy="79" rx="21" ry="5.5" fill="#FBBF24" stroke="#78350F" strokeWidth="2.2" />
      <path d="M134 77C134 66 139 60 147 60C155 60 160 66 160 77H134Z" fill="#FDE047" stroke="#78350F" strokeWidth="2.2" />
      <path d="M134 73H160V77H134V73Z" fill="#EF4444" />

      {/* Thân tàu gỗ màu cam vàng tươi */}
      <path
        d="M72 108H226L208 144H94L72 108Z"
        fill="#D97706"
        stroke="#78350F"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <rect x="82" y="114" width="134" height="10" rx="4" fill="#F59E0B" />
      {/* Ô cửa sổ tròn trên thân tàu */}
      <circle cx="116" cy="131" r="5" fill="#BAE6FD" stroke="#78350F" strokeWidth="2" />
      <circle cx="144" cy="131" r="5" fill="#BAE6FD" stroke="#78350F" strokeWidth="2" />
      <circle cx="172" cy="131" r="5" fill="#BAE6FD" stroke="#78350F" strokeWidth="2" />

      {/* Đầu sư tử/hoa hướng dương cute ở mũi tàu */}
      <circle cx="223" cy="116" r="14" fill="#FBBF24" stroke="#92400E" strokeWidth="2.5" />
      <circle cx="223" cy="116" r="9" fill="#FEF08A" />
      <circle cx="220" cy="115" r="1.5" fill="#78350F" />
      <circle cx="226" cy="115" r="1.5" fill="#78350F" />
      <path d="M220.5 119C222 120.5 224 120.5 225.5 119" stroke="#78350F" strokeWidth="1.8" strokeLinecap="round" />

      {/* Sóng biển xanh bồng bềnh */}
      <path
        d="M16 146C34 136 52 136 70 146C88 156 106 156 124 146C142 136 160 136 178 146C196 156 214 156 232 146C250 136 268 136 286 146V170H16V146Z"
        fill="#38BDF8"
      />
      <path
        d="M16 156C36 148 56 148 76 156C96 164 116 164 136 156C156 148 176 148 196 156C216 164 236 164 256 156C268 151 278 151 286 154V174H16V156Z"
        fill="#0284C7"
        fillOpacity="0.65"
      />
    </svg>
  );
}

export interface PirateCharacterProfile {
  id: PirateCharacterId;
  characterName: string;
  emoji: string;
  rank: string;
  avatarSrc: string;
  sprite3dSrc: string;
}

export const PIRATE_CHARACTER_CATALOG: PirateCharacterProfile[] = [
  {
    id: "luffy",
    characterName: "Luffy",
    emoji: "👒",
    rank: "Thuyền Trưởng Luffy",
    avatarSrc: "/avatars/luffy-huong.jpg",
    sprite3dSrc: "/avatars/3d/luffy.png",
  },
  {
    id: "zoro",
    characterName: "Zoro",
    emoji: "⚔️",
    rank: "Kiếm Sĩ Zoro",
    avatarSrc: "/avatars/zoro-lam.jpg",
    sprite3dSrc: "/avatars/3d/zoro.png",
  },
  {
    id: "nami",
    characterName: "Nami",
    emoji: "🧭",
    rank: "Hoa Tiêu Nami",
    avatarSrc: "/avatars/nami-thao.jpg",
    sprite3dSrc: "/avatars/3d/nami.png",
  },
  {
    id: "usopp",
    characterName: "Usopp",
    emoji: "🎯",
    rank: "Xạ Thủ Usopp",
    avatarSrc: "/avatars/usopp-hoang.jpg",
    sprite3dSrc: "/avatars/3d/usopp.png",
  },
  {
    id: "sanji",
    characterName: "Sanji",
    emoji: "🍳",
    rank: "Đầu Bếp Sanji",
    avatarSrc: "/avatars/sanji-canh.jpg",
    sprite3dSrc: "/avatars/3d/sanji.png",
  },
  {
    id: "chopper",
    characterName: "Chopper",
    emoji: "🩺",
    rank: "Bác Sĩ Chopper",
    avatarSrc: "/avatars/chopper-tuan2k8.jpg",
    sprite3dSrc: "/avatars/3d/chopper.png",
  },
  {
    id: "robin",
    characterName: "Robin",
    emoji: "🌸",
    rank: "Học Giả Robin",
    avatarSrc: "/avatars/robin-vy.jpg",
    sprite3dSrc: "/avatars/3d/robin.png",
  },
  {
    id: "franky",
    characterName: "Franky",
    emoji: "⚙️",
    rank: "Kỹ Sư Franky",
    avatarSrc: "/avatars/franky-tuan.jpg",
    sprite3dSrc: "/avatars/3d/franky.png",
  },
  {
    id: "brook",
    characterName: "Brook",
    emoji: "🎻",
    rank: "Nhạc Công Brook",
    avatarSrc: "/avatars/brook.jpg",
    sprite3dSrc: "/avatars/3d/brook.png",
  },
  {
    id: "jinbe",
    characterName: "Jinbe",
    emoji: "🐟",
    rank: "Lái Tàu Jinbe",
    avatarSrc: "/avatars/jinbe.jpg",
    sprite3dSrc: "/avatars/3d/jinbe.png",
  },
  {
    id: "mai",
    characterName: "Vivi",
    emoji: "🎨",
    rank: "Công Chúa Vivi",
    avatarSrc: "/avatars/vivi-mai.jpg",
    sprite3dSrc: "/avatars/3d/mai.png",
  },
  {
    id: "ace",
    characterName: "Ace",
    emoji: "🔥",
    rank: "Hỏa Quyền Ace",
    avatarSrc: "/avatars/ace.jpg",
    sprite3dSrc: "/avatars/3d/ace.png",
  },
  {
    id: "sabo",
    characterName: "Sabo",
    emoji: "🎩",
    rank: "Tham Mưu Sabo",
    avatarSrc: "/avatars/sabo.jpg",
    sprite3dSrc: "/avatars/3d/sabo.png",
  },
  {
    id: "law",
    characterName: "Law",
    emoji: "🗡️",
    rank: "Bác Sĩ Luật Law",
    avatarSrc: "/avatars/law.jpg",
    sprite3dSrc: "/avatars/3d/law.png",
  },
  {
    id: "shanks",
    characterName: "Shanks",
    emoji: "🥃",
    rank: "Tứ Hoàng Shanks",
    avatarSrc: "/avatars/shanks.jpg",
    sprite3dSrc: "/avatars/3d/shanks.png",
  },
];

const PROFILE_BY_ID = new Map<string, PirateCharacterProfile>(
  PIRATE_CHARACTER_CATALOG.map((item) => [item.id, item])
);

const CHARACTER_BY_SCOPE: Record<string, PirateCharacterProfile> = {
  LEADER: PROFILE_BY_ID.get("luffy")!,
  CONTENT_DESIGN: PROFILE_BY_ID.get("zoro")!,
  CONTENT: PROFILE_BY_ID.get("nami")!,
  CONTENT_EDIT: PROFILE_BY_ID.get("robin")!,
  WEB_ADS: PROFILE_BY_ID.get("franky")!,
  SUPPORT: PROFILE_BY_ID.get("chopper")!,
  MEDIA_VIDEO: PROFILE_BY_ID.get("usopp")!,
  MEDIA_DESIGN: PROFILE_BY_ID.get("mai")!,
};

const SANJI_PROFILE: PirateCharacterProfile = PROFILE_BY_ID.get("sanji")!;

function normalizeVi(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase();
}

/** Ánh xạ mỗi thành viên team sang nhân vật 3D One Piece (ưu tiên lựa chọn lưu trong DB) */
export function getPirateCharacter(
  name?: string | null,
  scope: DepartmentScope | string = "CONTENT",
  preferredCharacterId?: string | null
): PirateCharacterProfile {
  if (preferredCharacterId) {
    const normalizedId = preferredCharacterId === "vivi" ? "mai" : preferredCharacterId;
    const explicit = PROFILE_BY_ID.get(normalizedId);
    if (explicit) return explicit;
  }

  const n = normalizeVi(name || "");

  if (n.includes("huong") || n.includes("leader")) return CHARACTER_BY_SCOPE.LEADER;
  if (n.includes("lam")) return CHARACTER_BY_SCOPE.CONTENT_DESIGN;
  if (n.includes("thao")) return CHARACTER_BY_SCOPE.CONTENT;
  if (n.includes("vy")) return CHARACTER_BY_SCOPE.CONTENT_EDIT;
  if (n.includes("canh")) return SANJI_PROFILE;
  if (n.includes("2k8")) return CHARACTER_BY_SCOPE.SUPPORT;
  if (n.includes("tuns") || n.includes("tuan")) {
    return scope === "SUPPORT"
      ? CHARACTER_BY_SCOPE.SUPPORT
      : CHARACTER_BY_SCOPE.WEB_ADS;
  }
  if (n.includes("hoang")) return CHARACTER_BY_SCOPE.MEDIA_VIDEO;
  if (n.includes("mai")) return CHARACTER_BY_SCOPE.MEDIA_DESIGN;

  return (
    CHARACTER_BY_SCOPE[scope] ?? {
      id: "luffy",
      characterName: "Thuyền viên",
      emoji: "⚓",
      rank: "Thuyền Viên Mũ Rơm",
      avatarSrc: "/avatars/luffy-huong.jpg",
      sprite3dSrc: "/avatars/3d/luffy.png",
    }
  );
}

/** Danh hiệu Băng Mũ Rơm vui nhộn theo chuyên môn / tên thành viên */
export function getPirateRankLabel(
  scope: DepartmentScope | string,
  name?: string | null,
  preferredCharacterId?: string | null
): PirateCharacterProfile {
  return getPirateCharacter(name, scope, preferredCharacterId);
}

/** Avatar nhân vật 3D Băng Hải Tặc Mũ Rơm riêng cho từng thành viên */
export function PirateAvatar({
  name,
  color,
  scope = "CONTENT",
  pirateCharacter,
  size = "md",
  showBadge = true,
  animate = true,
}: {
  name: string;
  color: string;
  scope?: DepartmentScope | string;
  pirateCharacter?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  showBadge?: boolean;
  animate?: boolean;
}) {
  const character = getPirateCharacter(name, scope, pirateCharacter);

  const sizeConfig = {
    sm: { box: "w-7 h-7", px: 56, badge: "text-[9px] -top-1 -right-1 p-0.5" },
    md: { box: "w-9 h-9", px: 72, badge: "text-[11px] -top-1.5 -right-1.5 p-0.5" },
    lg: { box: "w-12 h-12", px: 96, badge: "text-xs -top-1 -right-1 p-0.5" },
    xl: { box: "w-16 h-16", px: 128, badge: "text-sm -top-1 -right-1 px-1 py-0.5" },
  }[size];

  return (
    <div
      className={`relative inline-flex shrink-0 transition-transform duration-200 hover:scale-110 ${
        animate ? "animate-pirate-bob" : ""
      }`}
      title={`${name} • ${character.rank}`}
    >
      <div
        className={`${sizeConfig.box} rounded-full overflow-hidden border-2 border-amber-300 shadow-sm ring-1 ring-amber-900/10`}
        style={{ backgroundColor: color }}
      >
        <Image
          src={character.avatarSrc}
          alt={`${name} (${character.characterName})`}
          width={sizeConfig.px}
          height={sizeConfig.px}
          className="w-full h-full object-cover object-top"
        />
      </div>
      {showBadge && (
        <span
          className={`absolute ${sizeConfig.badge} leading-none bg-white rounded-full shadow-sm border border-amber-200`}
          aria-hidden="true"
        >
          {character.emoji}
        </span>
      )}
    </div>
  );
}
