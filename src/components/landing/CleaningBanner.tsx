import cleaningBanner from "@/assets/cleaning-banner.png";

export function CleaningBanner() {
  return (
    <section className="bg-white">
      <div className="container-page">
        <img
          src={cleaningBanner}
          alt="Cars that feel new — every time. Professionally cleaned. Ready to drive."
          className="w-full h-auto block"
        />
      </div>
    </section>
  );
}
