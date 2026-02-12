"use client";

export function ContactModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center">
      <div className="bg-white w-full max-w-sm rounded-t-2xl p-4">
        <h2 className="font-semibold mb-3">Contacto</h2>

        <p>Whatsapp <a href="tel:+584120182319">+58 412-0182319</a></p>

        <button onClick={onClose} className="mt-4 w-full bg-gray-100 py-2 rounded">
          Cerrar
        </button>
      </div>
    </div>
  );
}
