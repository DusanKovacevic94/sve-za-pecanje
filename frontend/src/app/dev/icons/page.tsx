import { notFound } from "next/navigation";

import {
  AccountIcon,
  AddCircleIcon,
  AddIcon,
  AddListingIcon,
  AlertIcon,
  AnalyticsIcon,
  ArchiveIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  BellIcon,
  BellMutedIcon,
  BlockUserIcon,
  BoatCategoryIcon,
  BrandMarkIcon,
  CalendarClockIcon,
  CalendarIcon,
  CameraIcon,
  CheckIcon,
  ChevronDownIcon,
  CloseIcon,
  ClothingCategoryIcon,
  CloudOfflineIcon,
  DashboardIcon,
  DeleteIcon,
  DoubleCheckIcon,
  DownloadIcon,
  EditIcon,
  ElectronicsCategoryIcon,
  ExternalLinkIcon,
  FavoriteIcon,
  FileRemoveIcon,
  FiltersIcon,
  FollowedUserIcon,
  FollowUserIcon,
  IdeaIcon,
  InfoIcon,
  KitCategoryIcon,
  LineTackleCategoryIcon,
  LocationIcon,
  LockIcon,
  LogoutIcon,
  LureCategoryIcon,
  MailIcon,
  MessageIcon,
  OtherCategoryIcon,
  PendingCircleIcon,
  PhoneIcon,
  PromotionIcon,
  RatingIcon,
  ReactivateUserIcon,
  ReelCategoryIcon,
  ReportIcon,
  RetryIcon,
  RodCategoryIcon,
  SaveIcon,
  SearchIcon,
  SearchUnavailableIcon,
  SendIcon,
  SettingsIcon,
  ShareIcon,
  ShieldBlockedIcon,
  ShopBagIcon,
  SpinnerIcon,
  StoreIcon,
  SuccessIcon,
  TackleStorageCategoryIcon,
  TrustShieldIcon,
  UndoIcon,
  UserIcon,
  UsersIcon,
  VerifiedBadgeIcon,
  VerifiedMailIcon,
  ViewIcon,
  type IconComponent,
} from "@/components/icons";

export const metadata = {
  title: "Icon catalog | Sve Za Pecanje",
  robots: { index: false, follow: false },
};

const icons: { name: string; Icon: IconComponent }[] = [
  { name: "account", Icon: AccountIcon },
  { name: "add", Icon: AddIcon },
  { name: "add-circle", Icon: AddCircleIcon },
  { name: "add-listing", Icon: AddListingIcon },
  { name: "alert", Icon: AlertIcon },
  { name: "analytics", Icon: AnalyticsIcon },
  { name: "archive", Icon: ArchiveIcon },
  { name: "arrow-down", Icon: ArrowDownIcon },
  { name: "arrow-up", Icon: ArrowUpIcon },
  { name: "bell", Icon: BellIcon },
  { name: "bell-muted", Icon: BellMutedIcon },
  { name: "block-user", Icon: BlockUserIcon },
  { name: "brand-mark", Icon: BrandMarkIcon },
  { name: "calendar", Icon: CalendarIcon },
  { name: "calendar-clock", Icon: CalendarClockIcon },
  { name: "camera", Icon: CameraIcon },
  { name: "category-boat", Icon: BoatCategoryIcon },
  { name: "category-clothing", Icon: ClothingCategoryIcon },
  { name: "category-electronics", Icon: ElectronicsCategoryIcon },
  { name: "category-kit", Icon: KitCategoryIcon },
  { name: "category-line-tackle", Icon: LineTackleCategoryIcon },
  { name: "category-lure", Icon: LureCategoryIcon },
  { name: "category-other", Icon: OtherCategoryIcon },
  { name: "category-reel", Icon: ReelCategoryIcon },
  { name: "category-rod", Icon: RodCategoryIcon },
  { name: "category-tackle-storage", Icon: TackleStorageCategoryIcon },
  { name: "check", Icon: CheckIcon },
  { name: "chevron-down", Icon: ChevronDownIcon },
  { name: "close", Icon: CloseIcon },
  { name: "cloud-offline", Icon: CloudOfflineIcon },
  { name: "dashboard", Icon: DashboardIcon },
  { name: "delete", Icon: DeleteIcon },
  { name: "double-check", Icon: DoubleCheckIcon },
  { name: "download", Icon: DownloadIcon },
  { name: "edit", Icon: EditIcon },
  { name: "external-link", Icon: ExternalLinkIcon },
  { name: "favorite", Icon: FavoriteIcon },
  { name: "file-remove", Icon: FileRemoveIcon },
  { name: "filters", Icon: FiltersIcon },
  { name: "follow-user", Icon: FollowUserIcon },
  { name: "followed-user", Icon: FollowedUserIcon },
  { name: "idea", Icon: IdeaIcon },
  { name: "info", Icon: InfoIcon },
  { name: "location", Icon: LocationIcon },
  { name: "lock", Icon: LockIcon },
  { name: "logout", Icon: LogoutIcon },
  { name: "mail", Icon: MailIcon },
  { name: "message", Icon: MessageIcon },
  { name: "pending-circle", Icon: PendingCircleIcon },
  { name: "phone", Icon: PhoneIcon },
  { name: "promotion", Icon: PromotionIcon },
  { name: "rating", Icon: RatingIcon },
  { name: "reactivate-user", Icon: ReactivateUserIcon },
  { name: "report", Icon: ReportIcon },
  { name: "retry", Icon: RetryIcon },
  { name: "save", Icon: SaveIcon },
  { name: "search", Icon: SearchIcon },
  { name: "search-unavailable", Icon: SearchUnavailableIcon },
  { name: "send", Icon: SendIcon },
  { name: "settings", Icon: SettingsIcon },
  { name: "share", Icon: ShareIcon },
  { name: "shield-blocked", Icon: ShieldBlockedIcon },
  { name: "shop-bag", Icon: ShopBagIcon },
  { name: "spinner", Icon: SpinnerIcon },
  { name: "store", Icon: StoreIcon },
  { name: "success", Icon: SuccessIcon },
  { name: "trust-shield", Icon: TrustShieldIcon },
  { name: "undo", Icon: UndoIcon },
  { name: "user", Icon: UserIcon },
  { name: "users", Icon: UsersIcon },
  { name: "verified-badge", Icon: VerifiedBadgeIcon },
  { name: "verified-mail", Icon: VerifiedMailIcon },
  { name: "view", Icon: ViewIcon },
];

const sizes = [14, 18, 24, 32];

export default function IconCatalogPage() {
  if (process.env.NODE_ENV !== "development") notFound();

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl font-black">Custom icon catalog</h1>
      <p className="mt-2 text-slate-600">
        {icons.length} original SVG components on the shared 24×24 grid.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {icons.map(({ name, Icon }) => (
          <article
            key={name}
            data-catalog-icon={name}
            className="rounded-lg border border-sand-200 bg-white p-4"
          >
            <p className="font-mono text-xs font-bold text-slate-500">{name}</p>
            <div className="mt-4 flex min-h-12 items-center gap-4 text-river-700">
              {sizes.map((size) => (
                <Icon
                  key={size}
                  size={size}
                  className={name === "spinner" ? "motion-safe:animate-spin" : undefined}
                />
              ))}
            </div>
          </article>
        ))}
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg bg-white p-5 text-ink shadow-soft">
          <BrandMarkIcon size={32} />
        </div>
        <div className="rounded-lg bg-river-700 p-5 text-white shadow-soft">
          <BrandMarkIcon size={32} />
        </div>
        <div className="rounded-lg bg-ink p-5 text-reed-300 shadow-soft">
          <FavoriteIcon size={32} fill="currentColor" />
        </div>
      </section>

      <SearchIcon aria-label="Labelled icon example" className="mt-8 text-river-700" />
    </main>
  );
}

