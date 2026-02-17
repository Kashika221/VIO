import { useEffect, useState } from "react";
import { apiClient } from "../lib/api";
import { useAuth } from "../lib/AuthContext";

function Contact() {
  const { user } = useAuth();
  const contactInfo = [
    { icon: "📧", label: "Email", value: "mvibhuti82@gmail.com" },
    { icon: "📱", label: "Phone", value: "+91 86070 54400" },
  ];

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        name: prev.name || user.displayName || "",
        email: prev.email || user.email || "",
        message: prev.message,
      }));
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSendMessage = async () => {
    if (!formData.message.trim()) {
      setStatus({ type: "error", message: "Please enter a message." });
      return;
    }

    setSending(true);
    setStatus({ type: "", message: "" });

    try {
      await apiClient.sendContactMessage({
        name: formData.name || user?.displayName || "",
        email: formData.email || user?.email || "",
        message: formData.message,
        user_id: user?.uid || null,
      });

      setStatus({ type: "success", message: "Message sent successfully!" });
      setFormData((prev) => ({
        ...prev,
        message: "",
      }));
    } catch (err) {
      console.error("Contact send failed:", err);
      setStatus({ type: "error", message: "Failed to send. Please try again." });
    } finally {
      setSending(false);
    }
  };

  return (
    <div id="contact" className="py-12">
      <div className="space-y-8">
        <div className="text-center space-y-4">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-[#4B3BCB] shadow-sm">
            📧 Get in Touch
          </p>
          <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-[#17153B]">
            Contact Us
          </h2>
          <p className="text-base text-slate-700 max-w-2xl mx-auto">
            Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mt-12">
          {/* Contact Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#17153B] mb-2">Name</label>
              <input
                type="text"
                placeholder="Your name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl bg-white/70 border border-[#4B3BCB]/20 focus:outline-none focus:ring-2 focus:ring-[#4B3BCB] text-slate-700"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#17153B] mb-2">Email</label>
              <input
                type="email"
                placeholder="your.email@example.com"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl bg-white/70 border border-[#4B3BCB]/20 focus:outline-none focus:ring-2 focus:ring-[#4B3BCB] text-slate-700"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#17153B] mb-2">Message</label>
              <textarea
                rows="4"
                placeholder="Tell us how we can help..."
                name="message"
                value={formData.message}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl bg-white/70 border border-[#4B3BCB]/20 focus:outline-none focus:ring-2 focus:ring-[#4B3BCB] text-slate-700 resize-none"
              ></textarea>
            </div>
            {status.message && (
              <div
                className={`rounded-xl px-4 py-3 text-sm font-medium ${
                  status.type === "success"
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-600 border border-red-200"
                }`}
              >
                {status.message}
              </div>
            )}
            <button
              onClick={handleSendMessage}
              disabled={sending}
              className="w-full inline-flex items-center justify-center rounded-full bg-[#17153B] hover:bg-[#26235A] text-sm px-7 py-3 font-medium text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {sending ? "Sending..." : "Send Message"}
            </button>
          </div>

          {/* Contact Info */}
          <div className="space-y-6">
            <div className="rounded-2xl bg-gradient-to-br from-[#7C6CFF] via-[#B78BFF] to-[#FFE6FF] shadow-xl p-8 space-y-6">
              <h3 className="text-2xl font-semibold text-white">Let's Connect</h3>
              
              <div className="space-y-4">
                {contactInfo.map((info, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                      {info.icon}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white/90">{info.label}</p>
                      <p className="text-white whitespace-pre-line">{info.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t border-white/20">
                <p className="text-sm text-white/90 mb-3">Connect with our team</p>
                <div className="flex gap-3 flex-wrap">
                  <a
                    href="https://www.linkedin.com/in/kashika-malhotra-0519a7289/"
                    target="_blank"
                    rel="noreferrer"
                    className="h-10 w-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                    aria-label="Kashika LinkedIn"
                  >
                    in
                  </a>
                  <a
                    href="https://www.linkedin.com/in/anushka-singh-aa2695293/"
                    target="_blank"
                    rel="noreferrer"
                    className="h-10 w-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                    aria-label="Anushka LinkedIn"
                  >
                    in
                  </a>
                  <a
                    href="https://www.linkedin.com/in/shreya-jaiswal17/"
                    target="_blank"
                    rel="noreferrer"
                    className="h-10 w-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                    aria-label="Shreya LinkedIn"
                  >
                    in
                  </a>
                  <a
                    href="https://www.linkedin.com/in/vibhutimehta17/"
                    target="_blank"
                    rel="noreferrer"
                    className="h-10 w-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                    aria-label="Vibhuti LinkedIn"
                  >
                    in
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Contact;