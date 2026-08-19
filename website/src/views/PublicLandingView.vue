<!--
  @component PublicLandingView
  @description Hivelet public visitor landing page with centered hero, 3-category showcase card, transparent utility rules, and inline Direct Booking Inquiry card.
  @systemBibleRef Section 4 - Public Visitor Role & Section 5.4 - Centralized Inquiries
  @rationale Features a centered hero headline 'Live comfortably in hivelet stays', 3 category cards, House Rules & Utility Policies, and an inline Direct Booking Inquiry card below the rules. The 'Inquire Now' button smoothly scrolls down to the inquiry card without background blur.
  @innovations Smooth in-page scroll navigation to direct booking form with real-time landlady inbox sync.
-->
<script setup lang="ts">
import { ref } from 'vue';
import { 
  activeInquirers, isLiveChatheadOpen, 
  selectedInquirerId, showToast 
} from '@/lib/systemState';
import { 
  Star, ShieldCheck, Zap, Droplets, 
  MessageSquare, Layers, Home, Send, CheckCircle2 
} from 'lucide-vue-next';

// Inquiry form state
const prospectName = ref('');
const phone = ref('');
const email = ref('');
const message = ref('');
const isSubmitting = ref(false);
const isSubmitted = ref(false);

function scrollToInquire() {
  const el = document.getElementById('inquire');
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' });
  }
}

function handleDirectChat() {
  selectedInquirerId.value = 'inq-1';
  isLiveChatheadOpen.value = true;
}

function submitInquiry() {
  if (!prospectName.value.trim() || !phone.value.trim()) return;

  isSubmitting.value = true;
  const newInquirerId = `inq-${Date.now()}`;

  // Add inquiry into activeInquirers list in systemState
  activeInquirers.push({
    id: newInquirerId,
    name: prospectName.value.trim(),
    room: 'General',
    type: 'Boarding Unit',
    price: 4500,
    unread: true,
    messages: [
      {
        sender: 'Inquirer',
        time: 'Just now',
        text: message.value.trim() || `Hi Mrs. Fe Galang, I would like to inquire about available boarding rooms. Contact: ${phone.value.trim()} (${email.value.trim() || 'No email'})`
      }
    ]
  });

  isSubmitting.value = false;
  isSubmitted.value = true;
  selectedInquirerId.value = newInquirerId;
  showToast('success', 'Inquiry Delivered', 'Your message has been sent to Mrs. Fe Galang.');
}
</script>

<template>
  <div class="space-y-12 pb-16 bg-[#f4f5f7] text-[#172b4d]">

    <!-- ====================================================================
         1. HERO SECTION (Centered Headline & Clean Backdrop)
         ==================================================================== -->
    <section class="bg-[#0b132b] text-white pt-16 pb-20 px-4 sm:px-6 md:px-12 shadow-xl">
      <div class="max-w-4xl mx-auto text-center space-y-6">
        
        <!-- Star Rating & Location Badge -->
        <div class="inline-flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full border border-white/20 text-xs">
          <Star class="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span class="font-bold text-slate-100">Fe Galang Da Silva Boarding House</span>
          <span class="text-slate-400">•</span>
          <span class="text-slate-300">Barangay Sambat, Tanauan City</span>
        </div>

        <!-- Centered Main Headline -->
        <h1 class="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight font-display text-white max-w-3xl mx-auto leading-tight">
          Live comfortably in hivelet stays
        </h1>

        <!-- Centered Subtitle -->
        <p class="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Explore clean, secure, and affordable boarding house accommodations. Private bathrooms, individual electric sub-meters, and direct landlady communications.
        </p>

        <!-- Centered CTA Buttons -->
        <div class="pt-2 flex flex-wrap items-center justify-center gap-4">
          <button 
            type="button"
            @click="scrollToInquire" 
            class="bg-[#0c66e4] hover:bg-blue-600 text-white font-bold px-7 py-3 rounded-xl text-xs sm:text-sm shadow-lg transition-all cursor-pointer inline-flex items-center gap-2"
          >
            <MessageSquare class="w-4 h-4" />
            <span>Inquire Now</span>
          </button>

          <a 
            href="#categories" 
            class="bg-white/10 hover:bg-white/20 text-white font-bold px-6 py-3 rounded-xl text-xs sm:text-sm border border-white/20 transition-all inline-flex items-center gap-2"
          >
            <Layers class="w-4 h-4" />
            <span>Explore Room Categories</span>
          </a>
        </div>

      </div>
    </section>

    <!-- ====================================================================
         2. CATEGORY CARDS SHOWCASE (1 Bed Room, 2 Bed Room, 3 Bed Room)
         ==================================================================== -->
    <section id="categories" class="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 space-y-6">
      
      <!-- Container Master Card -->
      <div class="jira-card bg-white p-6 sm:p-8 rounded-3xl border border-[#dfe1e6] shadow-sm space-y-8">
        
        <!-- Header -->
        <div class="text-center max-w-2xl mx-auto space-y-2">
          <div class="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 text-[#0c66e4] rounded-full text-xs font-bold uppercase tracking-wider">
            <Home class="w-3.5 h-3.5" />
            <span>Room Categories</span>
          </div>
          <h2 class="text-2xl sm:text-3xl font-extrabold text-[#172b4d] font-display">
            Select Your Preferred Room Category
          </h2>
          <p class="text-xs sm:text-sm text-[#5e6c84] leading-relaxed">
            Click on any category below to view detailed unit specifications, availability status, capacity, and direct room inquiry options.
          </p>
        </div>

        <!-- 3 Separate Category Cards Grid -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">

          <!-- Category Card 1: 1 Bed Room -->
          <router-link 
            to="/category/1-bedroom"
            class="jira-card bg-[#f4f5f7] border border-[#dfe1e6] rounded-2xl overflow-hidden hover:shadow-xl transition-all flex flex-col justify-between group cursor-pointer block text-left"
          >
            <div class="space-y-4">
              <!-- Category Image -->
              <div class="h-52 w-full overflow-hidden relative">
                <img 
                  src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=600&q=80" 
                  alt="1 Bed Room Unit" 
                  class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              <!-- Content Below Image -->
              <div class="p-5 pt-0 space-y-2">
                <!-- Link Category Name -->
                <span class="text-xl font-extrabold text-[#0c66e4] group-hover:underline transition-colors block font-display">
                  1 Bed Room Unit
                </span>

                <p class="text-xs text-[#5e6c84] leading-relaxed">
                  Private 1-bedroom unit with private bathroom and independent sub-meter. Perfect for individuals or couples.
                </p>

                <div class="bg-white p-3 rounded-xl border border-[#dfe1e6] text-xs">
                  <div class="flex items-center justify-between">
                    <span class="text-[#5e6c84]">Capacity:</span>
                    <span class="font-bold text-[#172b4d]">Up to 3 Occupants</span>
                  </div>
                </div>
              </div>
            </div>
          </router-link>

          <!-- Category Card 2: 2 Bed Room -->
          <router-link 
            to="/category/2-bedroom"
            class="jira-card bg-[#f4f5f7] border border-[#dfe1e6] rounded-2xl overflow-hidden hover:shadow-xl transition-all flex flex-col justify-between group cursor-pointer block text-left"
          >
            <div class="space-y-4">
              <!-- Category Image -->
              <div class="h-52 w-full overflow-hidden relative">
                <img 
                  src="https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=600&q=80" 
                  alt="2 Bed Room Unit" 
                  class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              <!-- Content Below Image -->
              <div class="p-5 pt-0 space-y-2">
                <!-- Link Category Name -->
                <span class="text-xl font-extrabold text-[#0c66e4] group-hover:underline transition-colors block font-display">
                  2 Bed Room Unit
                </span>

                <p class="text-xs text-[#5e6c84] leading-relaxed">
                  Generous 2-bedroom unit offering flexible living space for co-tenants, students, or small families.
                </p>

                <div class="bg-white p-3 rounded-xl border border-[#dfe1e6] text-xs">
                  <div class="flex items-center justify-between">
                    <span class="text-[#5e6c84]">Capacity:</span>
                    <span class="font-bold text-[#172b4d]">Up to 4 Occupants</span>
                  </div>
                </div>
              </div>
            </div>
          </router-link>

          <!-- Category Card 3: 3 Bed Room -->
          <router-link 
            to="/category/3-bedroom"
            class="jira-card bg-[#f4f5f7] border border-[#dfe1e6] rounded-2xl overflow-hidden hover:shadow-xl transition-all flex flex-col justify-between group cursor-pointer block text-left"
          >
            <div class="space-y-4">
              <!-- Category Image -->
              <div class="h-52 w-full overflow-hidden relative">
                <img 
                  src="https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=600&q=80" 
                  alt="3 Bed Room Unit" 
                  class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              <!-- Content Below Image -->
              <div class="p-5 pt-0 space-y-2">
                <!-- Link Category Name -->
                <span class="text-xl font-extrabold text-[#0c66e4] group-hover:underline transition-colors block font-display">
                  3 Bed Room Unit
                </span>

                <p class="text-xs text-[#5e6c84] leading-relaxed">
                  Premium multi-bedroom suites and penthouse accommodations with exceptional airflow and spacious layouts.
                </p>

                <div class="bg-white p-3 rounded-xl border border-[#dfe1e6] text-xs">
                  <div class="flex items-center justify-between">
                    <span class="text-[#5e6c84]">Capacity:</span>
                    <span class="font-bold text-[#172b4d]">Up to 5 Occupants</span>
                  </div>
                </div>
              </div>
            </div>
          </router-link>

        </div>
      </div>

    </section>

    <!-- ====================================================================
         3. KEY ADVANTAGES & HOUSE RULES
         ==================================================================== -->
    <section id="rules" class="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 space-y-6">
      <div class="jira-card p-6 sm:p-8 bg-white border border-[#dfe1e6] rounded-3xl space-y-6 shadow-sm">
        <div>
          <h2 class="text-xl sm:text-2xl font-extrabold text-[#172b4d] font-display">House Rules & Utility Policies</h2>
          <p class="text-xs text-[#5e6c84] mt-1">Operational standards for all tenants at Fe Galang Da Silva Boarding House.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          <div class="p-4 bg-[#f4f5f7] rounded-xl border border-[#dfe1e6] space-y-2">
            <div class="flex items-center gap-2 font-bold text-[#0c66e4]">
              <Droplets class="w-4 h-4" />
              <span>Standard Water Rate</span>
            </div>
            <p class="text-[#5e6c84] leading-relaxed">
              Standard water utility is charged at a fixed rate of ₱200 per head monthly, added to the monthly rental invoice.
            </p>
          </div>

          <div class="p-4 bg-[#f4f5f7] rounded-xl border border-[#dfe1e6] space-y-2">
            <div class="flex items-center gap-2 font-bold text-[#0c66e4]">
              <Zap class="w-4 h-4" />
              <span>Private Sub-metered Electricity</span>
            </div>
            <p class="text-[#5e6c84] leading-relaxed">
              Each unit is equipped with its own individual electric sub-meter. Tenants pay only for actual recorded consumption.
            </p>
          </div>

          <div class="p-4 bg-[#f4f5f7] rounded-xl border border-[#dfe1e6] space-y-2">
            <div class="flex items-center gap-2 font-bold text-[#0c66e4]">
              <ShieldCheck class="w-4 h-4" />
              <span>Secure Premises</span>
            </div>
            <p class="text-[#5e6c84] leading-relaxed">
              Gated property with CCTV security in a quiet residential neighborhood close to schools and commercial hubs.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- ====================================================================
         4. DIRECT BOOKING INQUIRY CARD (Below House Rules & Utility Policies)
         ==================================================================== -->
    <section id="inquire" class="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8">
      <div class="jira-card p-6 sm:p-8 bg-white border border-[#dfe1e6] rounded-3xl space-y-6 shadow-md">
        
        <div class="border-b border-[#dfe1e6] pb-4">
          <div class="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 text-[#0c66e4] rounded-full text-xs font-bold uppercase tracking-wider mb-2">
            <MessageSquare class="w-3.5 h-3.5" />
            <span>Direct Landlady Inquiry</span>
          </div>
          <h2 class="text-2xl sm:text-3xl font-extrabold text-[#172b4d] font-display">
            Submit Direct Booking Inquiry
          </h2>
          <p class="text-xs sm:text-sm text-[#5e6c84] mt-1">
            Send your message directly to Mrs. Fe Galang's Landlady Inbox. No booking fees required.
          </p>
        </div>

        <!-- Success Message -->
        <div v-if="isSubmitted" class="p-6 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 space-y-3 text-xs">
          <div class="flex items-center gap-2">
            <CheckCircle2 class="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <strong class="font-bold text-sm">Inquiry Submitted Successfully!</strong>
          </div>
          <p class="leading-relaxed">
            Thank you, <strong>{{ prospectName }}</strong>. Your inquiry has been delivered directly to Mrs. Fe Galang's Landlady Inbox.
          </p>
          <div class="pt-2 flex flex-wrap items-center gap-3">
            <button 
              @click="handleDirectChat" 
              class="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
            >
              <MessageSquare class="w-3.5 h-3.5" />
              <span>Open Live Chat Messenger</span>
            </button>
            <button 
              @click="isSubmitted = false" 
              class="text-emerald-800 hover:underline font-bold text-xs"
            >
              Submit Another Inquiry
            </button>
          </div>
        </div>

        <!-- Inquiry Form -->
        <form v-else @submit.prevent="submitInquiry" class="space-y-4 text-xs">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-1">
              <label class="block font-bold text-[#5e6c84]">Full Name <span class="text-rose-500">*</span></label>
              <input 
                v-model="prospectName" 
                required 
                type="text" 
                placeholder="e.g. Gabriel Fernandez" 
                class="w-full p-3 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xl text-[#172b4d] font-semibold focus:outline-none focus:border-[#0c66e4] focus:bg-white transition-all" 
              />
            </div>

            <div class="space-y-1">
              <label class="block font-bold text-[#5e6c84]">Contact Phone Number <span class="text-rose-500">*</span></label>
              <input 
                v-model="phone" 
                required 
                type="tel" 
                placeholder="e.g. 0917-123-4567" 
                class="w-full p-3 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xl text-[#172b4d] font-semibold focus:outline-none focus:border-[#0c66e4] focus:bg-white transition-all" 
              />
            </div>
          </div>

          <div class="space-y-1">
            <label class="block font-bold text-[#5e6c84]">Email Address (Optional)</label>
            <input 
              v-model="email" 
              type="email" 
              placeholder="e.g. gabriel@gmail.com" 
              class="w-full p-3 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xl text-[#172b4d] font-semibold focus:outline-none focus:border-[#0c66e4] focus:bg-white transition-all" 
            />
          </div>

          <div class="space-y-1">
            <label class="block font-bold text-[#5e6c84]">Message / Questions for Mrs. Fe Galang</label>
            <textarea 
              v-model="message" 
              rows="3" 
              placeholder="State your preferred viewing schedule, questions, or target occupancy..." 
              class="w-full p-3 bg-[#f4f5f7] border border-[#dfe1e6] rounded-xl text-[#172b4d] font-semibold focus:outline-none focus:border-[#0c66e4] focus:bg-white transition-all"
            ></textarea>
          </div>

          <button 
            type="submit" 
            :disabled="isSubmitting"
            class="w-full bg-[#0c66e4] hover:bg-blue-600 text-white font-bold py-3.5 px-6 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-50"
          >
            <Send class="w-4 h-4" />
            <span>{{ isSubmitting ? 'Sending...' : 'Send Direct Inquiry to Landlady Inbox' }}</span>
          </button>
        </form>

      </div>
    </section>

  </div>
</template>
