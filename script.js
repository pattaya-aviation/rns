/**
 * Pattaya Aviation - Read & Sign
 * Mobile-First JavaScript
 * v7.2
 */

(function() {
  'use strict';

  // =============================================
  // DOM Elements
  // =============================================
  const form = document.getElementById('readSignForm');
  const submitBtn = document.getElementById('submitBtn');
  const formMessage = document.getElementById('formMessage');

  // Signature Elements
  const canvas = document.getElementById('signatureCanvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const signatureContainer = canvas.parentElement;
  const signaturePlaceholder = document.getElementById('signaturePlaceholder');
  const signatureWarning = document.getElementById('signatureWarning');
  const clearSignatureBtn = document.getElementById('clearSignature');

  // Consent Elements
  const ackRead = document.getElementById('ackRead');
  const ackPriv = document.getElementById('ackPriv');
  const consentWarning = document.getElementById('consentWarning');

  // Modal Elements
  const successModal = document.getElementById('successModal');
  const successDetail = document.getElementById('successDetail');
  const successTimer = document.getElementById('successTimer');
  const successOkBtn = document.getElementById('successOkBtn');

  // =============================================
  // State
  // =============================================
  let isDrawing = false;
  let lastPoint = null;
  let hasDrawn = false;
  let autoCloseTimer = null;
  let autoCloseSeconds = 30;

  // =============================================
  // Signature Canvas Setup
  // =============================================
  function setupCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1f2937';
    
    clearCanvas();
  }

  function clearCanvas() {
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    hasDrawn = false;
    signatureContainer.classList.remove('has-signature', 'invalid');
    signatureWarning.classList.remove('show');
    validateForm();
  }

  function getEventPoint(e) {
    const rect = canvas.getBoundingClientRect();
    
    if (e.touches && e.touches[0]) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    
    if (e.changedTouches && e.changedTouches[0]) {
      return {
        x: e.changedTouches[0].clientX - rect.left,
        y: e.changedTouches[0].clientY - rect.top
      };
    }
    
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  function startDrawing(e) {
    e.preventDefault();
    isDrawing = true;
    lastPoint = getEventPoint(e);
    
    // Start a new path
    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
  }

  function draw(e) {
    if (!isDrawing) return;
    e.preventDefault();
    
    const currentPoint = getEventPoint(e);
    
    ctx.lineTo(currentPoint.x, currentPoint.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(currentPoint.x, currentPoint.y);
    
    lastPoint = currentPoint;
    hasDrawn = true;
    signatureContainer.classList.add('has-signature');
  }

  function stopDrawing(e) {
    if (e) e.preventDefault();
    
    if (isDrawing) {
      ctx.closePath();
    }
    
    isDrawing = false;
    lastPoint = null;
    validateForm();
  }

  function hasSignature() {
    if (hasDrawn) return true;
    
    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Check for non-transparent pixels
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] !== 0) return true;
      }
    } catch (e) {
      console.warn('Could not check canvas data:', e);
    }
    
    return false;
  }

  function getSignatureDataURL() {
    return canvas.toDataURL('image/png');
  }

  // =============================================
  // Form Validation
  // =============================================
  function validateForm() {
    const isFormValid = form.checkValidity();
    const signatureValid = hasSignature();
    const consentValid = ackRead.checked && ackPriv.checked;
    
    // Update signature visual state
    if (!signatureValid && hasDrawn === false) {
      signatureContainer.classList.toggle('invalid', false);
    }
    signatureWarning.classList.toggle('show', !signatureValid && hasDrawn);
    
    // Update consent warning
    consentWarning.classList.toggle('show', !consentValid);
    
    // Enable/disable submit button
    const allValid = isFormValid && signatureValid && consentValid;
    submitBtn.disabled = !allValid;
    
    return allValid;
  }

  // =============================================
  // Form Submission
  // =============================================
  async function handleSubmit(e) {
    e.preventDefault();
    
    if (!validateForm()) {
      // Show validation warnings
      if (!hasSignature()) {
        signatureContainer.classList.add('invalid');
        signatureWarning.classList.add('show');
      }
      form.reportValidity();
      return;
    }
    
    // Show loading state
    submitBtn.disabled = true;
    submitBtn.classList.add('loading');
    showMessage('โปรดรอสักครู่ ระบบกำลังบันทึกข้อมูล...', 'info');
    
    try {
      // Collect form data
      const formData = new FormData(form);
      const data = {
        first_name: formData.get('first_name')?.trim() || '',
        last_name: formData.get('last_name')?.trim() || '',
        staff_id: formData.get('staff_id')?.trim() || '',
        position: formData.get('position')?.trim() || '',
        division: formData.get('division') || '',
        department: formData.get('department') || '',
        section: formData.get('section') || '',
        location: formData.get('location') || '',
        signature_data: getSignatureDataURL(),
        ack_read: ackRead.checked,
        ack_priv: ackPriv.checked
      };
      
      // Validate required fields
      if (!data.first_name) throw new Error('กรุณากรอกชื่อจริง');
      if (!data.last_name) throw new Error('กรุณากรอกนามสกุล');
      if (!/^[0-9]{5}$/.test(data.staff_id)) throw new Error('รหัสพนักงานต้องเป็นตัวเลข 5 หลัก');
      if (!data.position) throw new Error('กรุณากรอกตำแหน่ง');
      if (!data.division) throw new Error('กรุณาเลือกฝ่าย');
      if (!data.department) throw new Error('กรุณาเลือกแผนก');
      if (!data.section) throw new Error('กรุณาเลือกส่วนงาน');
      if (!data.location) throw new Error('กรุณาเลือกสถานี');
      
      // Simulate API call (replace with actual Google Apps Script call)
      // For demo purposes, we'll simulate a successful response
      await simulateAPICall(data);
      
      // Success
      const now = new Date();
      const timestamp = now.toLocaleString('th-TH', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      
      showSuccessModal(data.staff_id, timestamp);
      resetForm();
      hideMessage();
      
    } catch (error) {
      showMessage('❌ ' + (error.message || 'เกิดข้อผิดพลาด'), 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.classList.remove('loading');
      validateForm();
    }
  }

  // Simulate API call - Replace this with actual Google Apps Script call
  function simulateAPICall(data) {
    return new Promise((resolve, reject) => {
      console.log('Submitting data:', data);
      
      // Simulate network delay
      setTimeout(() => {
        // For demo, always succeed
        // In production, use: google.script.run.withSuccessHandler(resolve).withFailureHandler(reject).submitForm(data);
        resolve({ ok: true, timestamp: new Date().toISOString() });
      }, 1500);
    });
  }

  function resetForm() {
    form.reset();
    clearCanvas();
    validateForm();
  }

  // =============================================
  // Messages
  // =============================================
  function showMessage(text, type = 'info') {
    formMessage.textContent = text;
    formMessage.className = 'form-message show';
    
    if (type === 'error') {
      formMessage.classList.add('error');
    } else if (type === 'success') {
      formMessage.classList.add('success');
    }
  }

  function hideMessage() {
    formMessage.className = 'form-message';
    formMessage.textContent = '';
  }

  // =============================================
  // Success Modal
  // =============================================
  function showSuccessModal(staffId, timestamp) {
    successDetail.textContent = `รหัสพนักงาน: ${staffId}  เวลา: ${timestamp}`;
    successModal.classList.add('show');
    
    // Auto-close timer
    autoCloseSeconds = 30;
    updateTimerDisplay();
    
    autoCloseTimer = setInterval(() => {
      autoCloseSeconds--;
      updateTimerDisplay();
      
      if (autoCloseSeconds <= 0) {
        closeSuccessModal();
      }
    }, 1000);
    
    // Focus the OK button
    successOkBtn.focus();
  }

  function updateTimerDisplay() {
    successTimer.textContent = `หน้าต่างนี้จะปิดอัตโนมัติใน ${autoCloseSeconds} วินาที`;
  }

  function closeSuccessModal() {
    if (autoCloseTimer) {
      clearInterval(autoCloseTimer);
      autoCloseTimer = null;
    }
    
    successModal.classList.remove('show');
  }

  // =============================================
  // Event Listeners
  // =============================================
  function initEventListeners() {
    // Canvas touch events
    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDrawing, { passive: false });
    canvas.addEventListener('touchcancel', stopDrawing, { passive: false });
    
    // Canvas mouse events
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);
    
    // Clear signature button
    clearSignatureBtn.addEventListener('click', clearCanvas);
    
    // Form validation on input
    form.addEventListener('input', validateForm);
    form.addEventListener('change', validateForm);
    
    // Form submission
    form.addEventListener('submit', handleSubmit);
    
    // Modal events
    successOkBtn.addEventListener('click', closeSuccessModal);
    
    successModal.querySelector('.modal-backdrop').addEventListener('click', closeSuccessModal);
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && successModal.classList.contains('show')) {
        closeSuccessModal();
      }
    });
    
    // Window resize - recalculate canvas
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(setupCanvas, 100);
    });
    
    // Prevent gestures on iOS
    ['gesturestart', 'gesturechange', 'gestureend'].forEach(eventType => {
      document.addEventListener(eventType, (e) => {
        e.preventDefault();
      }, { passive: false });
    });
  }

  // =============================================
  // Initialization
  // =============================================
  function init() {
    // Setup canvas after fonts and layout are ready
    if (document.readyState === 'complete') {
      requestAnimationFrame(() => {
        requestAnimationFrame(setupCanvas);
      });
    } else {
      window.addEventListener('load', () => {
        requestAnimationFrame(() => {
          requestAnimationFrame(setupCanvas);
        });
      });
    }
    
    // Initialize event listeners
    initEventListeners();
    
    // Initial validation
    validateForm();
    
    console.log('Read & Sign form initialized');
  }

  // Start the app
  init();
})();
