import deliveryBanner from "@/assets/delivery-banner.png";

export function DeliveryBanner() {
  return (
    <section className="bg-white">
      <div className="container-page py-12 md:py-0">
        <div className="flex flex-col md:flex-row md:items-center md:min-h-[440px]">
          {/* Text */}
          <div className="md:w-1/2 py-8 md:py-16">
            <h2 className="text-[32px] md:text-[44px] font-bold tracking-[-0.02em] leading-[1.1] text-zinc-950">
              Skip the Pickup —<br />We Bring the Car to You
            </h2>
            <div className="w-12 h-[3px] rounded-full mt-5 mb-6" style={{ backgroundColor: "#197149" }} />
            <p className="text-[17px] md:text-[20px] text-zinc-500">
              Simple delivery. Zero hassle.
            </p>
          </div>

          {/* Image */}
          <div className="md:w-1/2 flex items-center justify-center">
            <img
              src={deliveryBanner}
              alt="Car delivery service illustration"
              className="w-full h-auto object-contain"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
