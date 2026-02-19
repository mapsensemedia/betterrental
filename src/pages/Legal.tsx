const Legal = () => {
  return (
    <div className="min-h-screen bg-background">
      <iframe
        src="/documents/rental-agreement.pdf"
        title="Rental Agreement"
        className="w-full h-screen"
        style={{ border: "none" }}
      />
    </div>
  );
};

export default Legal;
