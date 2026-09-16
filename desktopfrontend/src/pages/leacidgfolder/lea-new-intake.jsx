// desktopfrontend/src/pages/leacidgfolder/lea-new-intake.jsx
import './lea-css.css'
import Sidebar from '../component/sidebar'
import TopBar from '../component/top-bar'
import { AlertCircle, CheckCircle, AlertTriangle, Info, XCircle, X, Image as ImageIcon, FileText, Eye, Download, Paperclip } from 'lucide-react'
import mammoth from 'mammoth'

import { useState, useEffect } from 'react' // ADDED useEffect: runs code on page load
import { useLocation, useNavigate } from 'react-router-dom' // ADDED: read nav data + redirect

// ADDED — backend URL in one place, so it's easy to update later
const API_BASE = 'http://127.0.0.1:8000'

function LeaNewIntake() {
  const location = useLocation()  // ADDED
  const navigate = useNavigate()  // ADDED

  // ADDED — draftId passed in from Saved Drafts "Edit Draft" click.
  // null = brand new intake, no draft involved.
  const editingDraftId = location.state?.draftId ?? null
  const editingComplaintId = location.state?.complaintId ?? null
  // ADDED — on page load, if editing an already-submitted complaint,
  // fetch its full detail and fill every field
  useEffect(() => {
    if (!editingComplaintId) return  // brand new intake or draft edit — nothing to fetch

    const token = localStorage.getItem('access_token')
    setLoading(true)

    fetch(`${API_BASE}/complaints/${editingComplaintId}/walkin-detail`, {
      headers: { authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data) => {
        setFullName(data.full_name ?? '')
        setContactNumber(data.contact_number ?? '')
        setEmail(data.email ?? '')
        setIdType(data.id_type ?? '')
        setAddress(data.address ?? '')
        setProductName(data.product_title ?? '')
        setManufacturer(data.manufacturer ?? '')
        setProductCategory(data.product_category ?? '')
        setPlaceOfPurchase(data.place_of_purchase ?? '')
        setDateOfPurchase(data.date_of_purchase ?? '')
        setAmountPaid(data.amount_paid ?? '')
        setNatureOfComplaint(data.nature_of_complaint ?? '')
        setExistingAttachments(
          (data.attached_files ?? []).map((f) => ({
            attachment_id: f.file_id,
            file_name: f.file_name,
          }))
        )
      })
      .catch(() => showToast('Could not load this complaint.'))
      .finally(() => setLoading(false))
  }, [editingComplaintId])



  const [files, setFiles] = useState([])
  const [previewFile, setPreviewFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [docxHtml, setDocxHtml] = useState('')
  const [docxLoading, setDocxLoading] = useState(false)
  const [docxError, setDocxError] = useState(false)

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  useEffect(() => {
    if (!previewFile) {
      setPreviewUrl(null)
      setDocxHtml('')
      setDocxLoading(false)
      setDocxError(false)
      return
    }

    const isDocx = previewFile.name?.toLowerCase().endsWith('.docx') ||
                   previewFile.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

    if (isDocx) {
      setPreviewUrl(null)
      setDocxLoading(true)
      setDocxError(false)
      previewFile.arrayBuffer()
        .then((arrayBuffer) => mammoth.convertToHtml({ arrayBuffer }))
        .then((result) => {
          setDocxHtml(result.value)
        })
        .catch((err) => {
          console.error('Docx conversion error:', err)
          setDocxError(true)
        })
        .finally(() => {
          setDocxLoading(false)
        })
    } else {
      setDocxHtml('')
      const url = URL.createObjectURL(previewFile)
      setPreviewUrl(url)
      return () => {
        URL.revokeObjectURL(url)
      }
    }
  }, [previewFile])

  // ADDED — files already saved on the draft (from backend), separate
  // from `files` (new uploads picked just now)
  const [existingAttachments, setExistingAttachments] = useState([])
  // ADDED — old attachment IDs the officer removed, sent to backend on save
  const [attachmentIdsToRemove, setAttachmentIdsToRemove] = useState([])

  const [loading, setLoading] = useState(false)  // ADDED — disables buttons mid-request

  // ADDED — replaces errorMessage. { message, type: 'error' | 'success' }
  const [toast, setToast] = useState(null)

  // ADDED — one state var per field. Original inputs had none of these
  // (uncontrolled), so React couldn't read or pre-fill them.
  const [fullName, setFullName] = useState('')
  const [contactNumber, setContactNumber] = useState('')
  const [email, setEmail] = useState('')
  const [idType, setIdType] = useState('')
  const [address, setAddress] = useState('')
  const [productName, setProductName] = useState('')
  const [manufacturer, setManufacturer] = useState('')
  const [productCategory, setProductCategory] = useState('')
  const [placeOfPurchase, setPlaceOfPurchase] = useState('')
  const [dateOfPurchase, setDateOfPurchase] = useState('')
  const [amountPaid, setAmountPaid] = useState('')
  const [natureOfComplaint, setNatureOfComplaint] = useState('')

  // ADDED — Frontend field validation state
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})

  // Helper to get current value for a given field name
  const getFieldValue = (field) => {
    switch (field) {
      case 'fullName': return fullName
      case 'contactNumber': return contactNumber
      case 'email': return email
      case 'productName': return productName
      case 'manufacturer': return manufacturer
      case 'productCategory': return productCategory
      case 'placeOfPurchase': return placeOfPurchase
      case 'dateOfPurchase': return dateOfPurchase
      case 'amountPaid': return amountPaid
      case 'natureOfComplaint': return natureOfComplaint
      case 'attachments': return { files, existingAttachments }
      default: return ''
    }
  }

  // Validate an individual field and return its error string (if any)
  const validateSingleField = (field, value) => {
    if (field === 'fullName') {
      if (value && value.trim()) {
        const nameRegex = /^[a-zA-Z\s.'\-]+$/
        if (!nameRegex.test(value.trim())) {
          return 'Please enter a valid full name (letters only).'
        }
      }
      return ''
    }

    if (field === 'contactNumber') {
      if (value && value.trim()) {
        const val = value.trim()
        if (/[a-zA-Z]/.test(val) || /[^0-9+]/.test(val)) {
          return 'Please enter a valid contact number.'
        }
        const phPhoneRegex = /^(09|\+?639)\d{9}$/
        if (!phPhoneRegex.test(val)) {
          return 'Please enter a valid Philippine contact number (e.g. 09123456789).'
        }
      }
      return ''
    }

    if (field === 'email') {
      if (value && value.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(value.trim())) {
          return 'Please enter a valid email address.'
        }
      }
      return ''
    }

    if (field === 'productName') {
      if (!value || !value.trim()) {
        return 'Product Name is required.'
      }
      return ''
    }

    if (field === 'manufacturer') {
      if (!value || !value.trim()) {
        return 'Manufacturer/Seller is required.'
      }
      return ''
    }

    if (field === 'productCategory') {
      if (!value || !value.trim()) {
        return 'Category is required.'
      }
      return ''
    }

    if (field === 'placeOfPurchase') {
      if (!value || !value.trim()) {
        return 'Place of Purchase is required.'
      }
      return ''
    }

    if (field === 'dateOfPurchase') {
      if (!value || !value.trim()) {
        return 'Date of Purchase is required.'
      }
      const selectedDate = new Date(value)
      const today = new Date()
      today.setHours(23, 59, 59, 999)
      if (selectedDate > today) {
        return 'Date of Purchase cannot be in the future.'
      }
      return ''
    }

    if (field === 'amountPaid') {
      if (value !== '' && value !== null && value !== undefined) {
        if (Number(value) < 0) {
          return 'Amount Paid cannot be negative.'
        }
      }
      return ''
    }

    if (field === 'natureOfComplaint') {
      if (!value || !value.trim()) {
        return 'Nature of Complaint is required.'
      }
      return ''
    }

    if (field === 'attachments') {
      const { files: fList, existingAttachments: eList } = value || {}
      const isEditingWithExisting = (editingDraftId || editingComplaintId)
      if ((!fList || fList.length === 0) && (!isEditingWithExisting || !eList || eList.length === 0)) {
        return 'Please attach at least one supporting document or photo.'
      }
      return ''
    }

    return ''
  }

  // Optional fields list for real-time format validation
  const optionalFields = ['fullName', 'contactNumber', 'email', 'amountPaid']

  // Handles blurring an input — marks field as touched and computes error
  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
    const fieldError = validateSingleField(field, getFieldValue(field))
    setErrors((prev) => ({ ...prev, [field]: fieldError }))
  }

  // Handles value changes — updates state & performs real-time format validation on typing
  const handleChangeField = (field, setter, val) => {
    setter(val)
    const err = validateSingleField(field, val)

    if (optionalFields.includes(field)) {
      setErrors((prev) => ({ ...prev, [field]: err }))
      return
    }

    if (touched[field] || (err && err.includes('future'))) {
      setErrors((prev) => ({ ...prev, [field]: err }))
    }
  }

  // Validate entire form for submission
  const validateForm = () => {
    const fieldsToValidate = [
      'fullName',
      'contactNumber',
      'email',
      'productName',
      'manufacturer',
      'productCategory',
      'placeOfPurchase',
      'dateOfPurchase',
      'amountPaid',
      'natureOfComplaint',
      'attachments'
    ]

    const newErrors = {}
    const newTouched = {}

    fieldsToValidate.forEach((field) => {
      newTouched[field] = true
      const err = validateSingleField(field, getFieldValue(field))
      if (err) {
        newErrors[field] = err
      }
    })

    setTouched(newTouched)
    setErrors(newErrors)

    return Object.keys(newErrors).length === 0
  }

  // Validate format of filled fields when saving a draft
  const validateFormatForDraft = () => {
    const fieldsToValidate = ['fullName', 'contactNumber', 'email', 'dateOfPurchase', 'amountPaid']
    const newErrors = { ...errors }
    const newTouched = { ...touched }
    let isValid = true

    fieldsToValidate.forEach((field) => {
      const val = getFieldValue(field)
      if (field === 'dateOfPurchase') {
        if (val && val.trim()) {
          const selectedDate = new Date(val)
          const today = new Date()
          today.setHours(23, 59, 59, 999)
          if (selectedDate > today) {
            newErrors[field] = 'Date of Purchase cannot be in the future.'
            newTouched[field] = true
            isValid = false
          } else {
            newErrors[field] = ''
          }
        } else {
          newErrors[field] = ''
        }
      } else {
        const err = validateSingleField(field, val)
        if (err) {
          newErrors[field] = err
          newTouched[field] = true
          isValid = false
        }
      }
    })

    setTouched(newTouched)
    setErrors(newErrors)
    return isValid
  }

  // ADDED — shows a toast for 3 seconds then auto-clears
  const showToast = (message, type = 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // ADDED — on page load, if editing a draft, fetch it and fill every field
  useEffect(() => {
    if (!editingDraftId) return  // brand new intake — nothing to fetch

    const token = localStorage.getItem('access_token')
    setLoading(true)

    fetch(`${API_BASE}/drafts/walkin/${editingDraftId}`, {
      headers: { authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setFullName(data.full_name ?? '')
        setContactNumber(data.contact_number ?? '')
        setEmail(data.email ?? '')
        setIdType(data.id_type ?? '')
        setAddress(data.address ?? '')
        setProductName(data.product_name ?? '')
        setManufacturer(data.manufacturer ?? '')
        setProductCategory(data.product_category ?? '')
        setPlaceOfPurchase(data.place_of_purchase ?? '')
        setDateOfPurchase(data.date_of_purchase ?? '')
        setAmountPaid(data.amount_paid ?? '')
        setNatureOfComplaint(data.nature_of_complaint ?? '')
        setExistingAttachments(data.attachments ?? [])
      })
      .catch(() => showToast('Could not load this draft.'))
      .finally(() => setLoading(false))
  }, [editingDraftId])

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const updated = [...files, ...Array.from(e.target.files)]
      setFiles(updated)
      if (touched.attachments) {
        const err = validateSingleField('attachments', { files: updated, existingAttachments })
        setErrors((prev) => ({ ...prev, attachments: err }))
      }
      e.target.value = ""
    }
  }

  const handleRemoveFile = (indexToRemove) => {
    const fileToRemove = files[indexToRemove]
    if (previewFile && previewFile === fileToRemove) {
      setPreviewFile(null)
    }
    const updated = files.filter((_, index) => index !== indexToRemove)
    setFiles(updated)
    if (touched.attachments) {
      const err = validateSingleField('attachments', { files: updated, existingAttachments })
      setErrors((prev) => ({ ...prev, attachments: err }))
    }
  }

  const handleRemoveExistingAttachment = (attachmentId) => {
    const updatedExisting = existingAttachments.filter((a) => a.attachment_id !== attachmentId)
    setExistingAttachments(updatedExisting)
    setAttachmentIdsToRemove([...attachmentIdsToRemove, attachmentId])
    if (touched.attachments) {
      const err = validateSingleField('attachments', { files, existingAttachments: updatedExisting })
      setErrors((prev) => ({ ...prev, attachments: err }))
    }
  }

  const [isDragActive, setIsDragActive] = useState(false)

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const updated = [...files, ...Array.from(e.dataTransfer.files)]
      setFiles(updated)
      if (touched.attachments) {
        const err = validateSingleField('attachments', { files: updated, existingAttachments })
        setErrors((prev) => ({ ...prev, attachments: err }))
      }
      e.dataTransfer.clearData()
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)
  }

  const buildFormData = () => {
    const formData = new FormData()
    formData.append('full_name', fullName)
    formData.append('contact_number', contactNumber)
    formData.append('email', email)
    formData.append('id_type', idType)
    formData.append('address', address)
    formData.append('product_name', productName)
    formData.append('manufacturer', manufacturer)
    formData.append('product_category', productCategory)
    formData.append('place_of_purchase', placeOfPurchase)
    if (dateOfPurchase && dateOfPurchase.trim()) {
      formData.append('date_of_purchase', dateOfPurchase)
    }
    if (amountPaid !== '' && amountPaid !== null && amountPaid !== undefined) {
      formData.append('amount_paid', amountPaid)
    }
    formData.append('nature_of_complaint', natureOfComplaint)
    files.forEach((file) => formData.append('files', file))
    return formData
  }

  const parseBackendError = async (res) => {
    try {
      const errorData = await res.json()
      if (Array.isArray(errorData.detail)) {
        return errorData.detail.map((e) => e.msg).join(', ')
      }
      return errorData.detail || 'Something went wrong. Please try again.'
    } catch {
      return 'Something went wrong. Please try again.'
    }
  }

  const handleSaveAsDraft = async () => {
    if (editingComplaintId) {
      showToast('This complaint is already submitted and cannot be saved as a draft.')
      return
    }

    if (!validateFormatForDraft()) {
      showToast('Please fix the validation errors before saving.')
      return
    }

    setLoading(true)
    const token = localStorage.getItem('access_token')
    const formData = buildFormData()

    if (editingDraftId) {
      attachmentIdsToRemove.forEach((id) => formData.append('remove_attachment_ids', id))
    }

    const url = editingDraftId
      ? `${API_BASE}/drafts/walkin/${editingDraftId}`
      : `${API_BASE}/drafts/walkin/`
    const method = editingDraftId ? 'PUT' : 'POST'

    try {
      const res = await fetch(url, {
        method,
        headers: { authorization: `Bearer ${token}` },
        body: formData,
      })
      if (!res.ok) {
        showToast(await parseBackendError(res))
        return
      }
      showToast('Draft saved successfully.', 'success')
      navigate('/leacidgfolder/lea-saved-draft')
    } catch (err) {
      showToast(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogComplaint = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      showToast('Please fix the validation errors before submitting.')
      return
    }

    setLoading(true)
    const token = localStorage.getItem('access_token')

    try {
      let res
      if (editingComplaintId) {
        const formData = buildFormData()
        attachmentIdsToRemove.forEach((id) => formData.append('remove_attachment_ids', id))

        res = await fetch(`${API_BASE}/complaints/walkin/${editingComplaintId}`, {
          method: 'PUT',
          headers: { authorization: `Bearer ${token}` },
          body: formData,
        })
      } else if (editingDraftId) {
        const formData = buildFormData()
        attachmentIdsToRemove.forEach((id) => formData.append('remove_attachment_ids', id))

        const updateRes = await fetch(`${API_BASE}/drafts/walkin/${editingDraftId}`, {
          method: 'PUT',
          headers: { authorization: `Bearer ${token}` },
          body: formData,
        })

        if (!updateRes.ok) {
          showToast(await parseBackendError(updateRes))
          setLoading(false)
          return
        }

        res = await fetch(`${API_BASE}/drafts/walkin/${editingDraftId}/submit`, {
          method: 'POST',
          headers: { authorization: `Bearer ${token}` },
        })
      } else {
        const formData = buildFormData()
        res = await fetch(`${API_BASE}/complaints/walkin/`, {
          method: 'POST',
          headers: { authorization: `Bearer ${token}` },
          body: formData,
        })
      }

      if (!res.ok) {
        showToast(await parseBackendError(res))
        return
      }
      showToast('Complaint logged successfully.', 'success')
      navigate('/leacidgfolder/lea-walkin-complaints')
    } catch (err) {
      showToast(err.message)
    } finally {
      setLoading(false)
    }

  }

  return ( 
    <div className='LeaDashboardMain'>
      <Sidebar sidebarType="LEA" />
      <div className='LeaContentContainer'>
        <TopBar topbarType="LEA" />
        <div className='LeaMainfeed'>
          <div className='LeaHeader'>
            <div>
              <p>LEA-CIDG: Intake</p>
              <p>LOG A NEW WALK-IN COMPLAINT</p>
            </div>
          </div>

          <div className='FormForWalkin'>
            <form onSubmit={handleLogComplaint} noValidate>
              <div className='FormSection'>
                <h3>COMPLAINANT DETAILS</h3>
                <div className='col'>
                  <div>
                    <label htmlFor="fullName">Full Name (OPTIONAL)</label>
                    <input
                      id="fullName"
                      type="text"
                      placeholder='Ex. Juan Dela cruz'
                      value={fullName}
                      onChange={(e) => handleChangeField('fullName', setFullName, e.target.value)}
                      onBlur={() => handleBlur('fullName')}
                      className={errors.fullName ? 'InputErrorBorder' : ''}
                    />
                    {errors.fullName && (
                      <span className="LoginErrorMsg">
                        <AlertCircle size={12} /> {errors.fullName}
                      </span>
                    )}
                  </div>
                  <div>
                    <label htmlFor="contactNumber">Contact (OPTIONAL)</label>
                    <input
                      id="contactNumber"
                      type="text"
                      placeholder='Ex. 09XXXXXXXXX'
                      value={contactNumber}
                      onChange={(e) => handleChangeField('contactNumber', setContactNumber, e.target.value)}
                      onBlur={() => handleBlur('contactNumber')}
                      className={errors.contactNumber ? 'InputErrorBorder' : ''}
                    />
                    {errors.contactNumber && (
                      <span className="LoginErrorMsg">
                        <AlertCircle size={12} /> {errors.contactNumber}
                      </span>
                    )}
                  </div>
                </div>
                <div className='col'>
                  <div>
                    <label htmlFor="email">Email (OPTIONAL)</label>
                    <input
                      id="email"
                      type="text"
                      placeholder='consumer@gmail.com'
                      value={email}
                      onChange={(e) => handleChangeField('email', setEmail, e.target.value)}
                      onBlur={() => handleBlur('email')}
                      className={errors.email ? 'InputErrorBorder' : ''}
                    />
                    {errors.email && (
                      <span className="LoginErrorMsg">
                        <AlertCircle size={12} /> {errors.email}
                      </span>
                    )}
                  </div>

                  <div>
                    <label htmlFor="idType">ID Presented (OPTIONAL)</label>
                    <select
                      id="idType"
                      value={idType}
                      onChange={(e) => setIdType(e.target.value)}
                    >
                      <option value="">Select ID Type</option>
                      <option value="philsys">PhilSys</option>
                      <option value="passport">Passport</option>
                      <option value="drivers_license">Driver's License</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <label htmlFor="address">Address (OPTIONAL)</label>
                <input
                  id="address"
                  type="text"
                  placeholder='Ex. Florida'
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div className='FormSection'>
                <h3>REPORTED PRODUCT</h3>
                <div className='col'>
                  <div>
                    <label htmlFor="productName">Product Name</label>
                    <input
                      id="productName"
                      type="text"
                      placeholder='Ex. Herbal Slim'
                      value={productName}
                      onChange={(e) => handleChangeField('productName', setProductName, e.target.value)}
                      onBlur={() => handleBlur('productName')}
                      className={errors.productName ? 'InputErrorBorder' : ''}
                    />
                    {errors.productName && (
                      <span className="LoginErrorMsg">
                        <AlertCircle size={12} /> {errors.productName}
                      </span>
                    )}
                  </div>
                  <div>
                    <label htmlFor="manufacturer">Manufacturer/Seller</label>
                    <input
                      id="manufacturer"
                      type="text"
                      placeholder='Ex. Naturefit labs'
                      value={manufacturer}
                      onChange={(e) => handleChangeField('manufacturer', setManufacturer, e.target.value)}
                      onBlur={() => handleBlur('manufacturer')}
                      className={errors.manufacturer ? 'InputErrorBorder' : ''}
                    />
                    {errors.manufacturer && (
                      <span className="LoginErrorMsg">
                        <AlertCircle size={12} /> {errors.manufacturer}
                      </span>
                    )}
                  </div>
                </div>

                <div className='col'>
                  <div>
                    <label htmlFor="productCategory">Category</label>
                    <select
                      id="productCategory"
                      value={productCategory}
                      onChange={(e) => handleChangeField('productCategory', setProductCategory, e.target.value)}
                      onBlur={() => handleBlur('productCategory')}
                      className={errors.productCategory ? 'InputErrorBorder' : ''}
                    >
                      <option value="">Select Category</option>
                      <option value="Food">Food</option>
                      <option value="Cosmetics">Cosmetics</option>
                      <option value="Drugs">Drugs</option>
                      <option value="Devices">Medical Devices</option>
                    </select>
                    {errors.productCategory && (
                      <span className="LoginErrorMsg">
                        <AlertCircle size={12} /> {errors.productCategory}
                      </span>
                    )}
                  </div>
                  <div>
                    <label htmlFor="placeOfPurchase">Place of Purchase</label>
                    <input
                      id="placeOfPurchase"
                      type="text"
                      placeholder='Public market, online seller etc.'
                      value={placeOfPurchase}
                      onChange={(e) => handleChangeField('placeOfPurchase', setPlaceOfPurchase, e.target.value)}
                      onBlur={() => handleBlur('placeOfPurchase')}
                      className={errors.placeOfPurchase ? 'InputErrorBorder' : ''}
                    />
                    {errors.placeOfPurchase && (
                      <span className="LoginErrorMsg">
                        <AlertCircle size={12} /> {errors.placeOfPurchase}
                      </span>
                    )}
                  </div>
                </div>

                <div className='col'>
                  <div>
                    <label htmlFor="dateOfPurchase">Date of Purchase</label>
                    <input
                      id="dateOfPurchase"
                      type="date"
                      value={dateOfPurchase}
                      onChange={(e) => handleChangeField('dateOfPurchase', setDateOfPurchase, e.target.value)}
                      onBlur={() => handleBlur('dateOfPurchase')}
                      className={errors.dateOfPurchase ? 'InputErrorBorder' : ''}
                    />
                    {errors.dateOfPurchase && (
                      <span className="LoginErrorMsg">
                        <AlertCircle size={12} /> {errors.dateOfPurchase}
                      </span>
                    )}
                  </div>
                  <div>
                    <label htmlFor="amountPaid">Amount Paid (OPTIONAL)</label>
                    <input
                      id="amountPaid"
                      type="number"
                      placeholder='500.00'
                      step="0.01"
                      min="0"
                      value={amountPaid}
                      onChange={(e) => handleChangeField('amountPaid', setAmountPaid, e.target.value)}
                      onBlur={() => handleBlur('amountPaid')}
                      className={errors.amountPaid ? 'InputErrorBorder' : ''}
                    />
                    {errors.amountPaid && (
                      <span className="LoginErrorMsg">
                        <AlertCircle size={12} /> {errors.amountPaid}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className='FormSection'>
                <h3>Complainant Statement</h3>
                <label htmlFor="natureOfComplaint">Nature Of Complaint</label>
                <textarea
                  id="natureOfComplaint"
                  rows='5'
                  placeholder='Statement of the complainant.'
                  value={natureOfComplaint}
                  onChange={(e) => handleChangeField('natureOfComplaint', setNatureOfComplaint, e.target.value)}
                  onBlur={() => handleBlur('natureOfComplaint')}
                  className={errors.natureOfComplaint ? 'InputErrorBorder' : ''}
                ></textarea>
                {errors.natureOfComplaint && (
                  <span className="LoginErrorMsg">
                    <AlertCircle size={12} /> {errors.natureOfComplaint}
                  </span>
                )}
              </div>

              <div className='FormSectionAttach'>
                <h3>Evidence & Attachment</h3>
                <p>Upload all the photos, receipts, ID Copy, and any supporting documents.</p>
                <div className='UploadArea'>
                  <input
                    type="file"
                    id="evidenceUpload"
                    multiple
                    accept=".jpg,.jpeg,.png,.pdf,.docx"
                    onChange={handleFileChange}
                    hidden
                  />

                  <label
                    htmlFor="evidenceUpload"
                    className={`UploadBox ${isDragActive ? 'UploadBoxDragActive' : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <div className="UploadContent">
                      <span className="UploadIcon">☁</span>
                      <h4>Drop files or click to upload</h4>
                      <p> PDF, JPG, PNG · Max 25 MB each</p>
                    </div>
                  </label>

                  {errors.attachments && (
                    <span className="LoginErrorMsg" style={{ marginTop: '8px' }}>
                      <AlertCircle size={12} /> {errors.attachments}
                    </span>
                  )}

                  {existingAttachments.length > 0 && (
                    <div className="LeaVerifDocsGrid" style={{ marginTop: '12px' }}>
                      {existingAttachments.map((attachment) => {
                        const isImage = attachment.mime_type?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(attachment.file_name)
                        return (
                          <div key={attachment.attachment_id} className="LeaVerifDocCard">
                            <div className="LeaVerifDocIcon">
                              {isImage ? <ImageIcon size={18} /> : <FileText size={18} />}
                            </div>
                            <div className="LeaVerifDocInfo">
                              <p className="LeaVerifDocName" title={attachment.file_name}>{attachment.file_name}</p>
                              <span className="LeaVerifDocMeta">{attachment.file_size_display || (attachment.file_size ? formatFileSize(attachment.file_size) : '')}</span>
                            </div>
                            <div className="LeaVerifDocActions" style={{ display: 'flex', gap: '4px' }}>
                              <button
                                type="button"
                                className="LeaVerifDocActionBtn"
                                title="Remove File"
                                onClick={() => handleRemoveExistingAttachment(attachment.attachment_id)}
                              >
                                <X size={13} />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {files.length > 0 && (
                    <div className="LeaVerifDocsGrid" style={{ marginTop: '12px' }}>
                      {files.map((file, index) => {
                        const isImage = file.type?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name)
                        return (
                          <div key={index} className="LeaVerifDocCard">
                            <div className="LeaVerifDocIcon">
                              {isImage ? <ImageIcon size={18} /> : <FileText size={18} />}
                            </div>
                            <div className="LeaVerifDocInfo">
                              <p className="LeaVerifDocName" title={file.name}>{file.name}</p>
                              <span className="LeaVerifDocMeta">{formatFileSize(file.size)}</span>
                            </div>
                            <div className="LeaVerifDocActions" style={{ display: 'flex', gap: '4px' }}>
                              <button
                                type="button"
                                className="LeaVerifDocActionBtn"
                                title="Inspect Attachment"
                                onClick={() => setPreviewFile(file)}
                              >
                                <Eye size={13} />
                              </button>
                              <button
                                type="button"
                                className="LeaVerifDocActionBtn"
                                title="Remove File"
                                onClick={() => handleRemoveFile(index)}
                              >
                                <X size={13} />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <button type="button" className='CancelButton' onClick={() => navigate(-1)}>Cancel</button>
                {!editingComplaintId && (
                <button type="button" className='DraftButton' disabled={loading} onClick={handleSaveAsDraft}>
                  {loading ? 'Saving...' : 'Save as Draft'}
                </button> 
                )}
                <button type="submit" className='LogButton' disabled={loading}>
                  {loading ? 'Submitting...' : 'Log Complaint & Queue for FDA'}
                </button>
              </div>
            </form>
          </div>
        </div>

      </div>

      {/* LOCAL ATTACHMENT PREVIEW MODAL */}
      {previewFile && (
        <div className="ModalOverlay">
          <div className="LeaVerifDocModalContainer">
            <div className="LeaVerifDocModalHeader">
              <div className="LeaVerifDocModalTitleGroup">
                <Paperclip size={16} className="LeaVerifBlueIcon" />
                <div>
                  <h3>{previewFile.name}</h3>
                  <p className="LeaVerifDocModalMeta">
                    {previewFile.type || 'Document'} &bull; {formatFileSize(previewFile.size)}
                  </p>
                </div>
              </div>
              <button type="button" className="LeaVerifIconButton" onClick={() => setPreviewFile(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="LeaVerifDocModalBody">
              {(previewFile.type?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(previewFile.name)) ? (
                <img
                  src={previewUrl}
                  alt={previewFile.name}
                  className="LeaVerifDocImagePreview"
                />
              ) : (previewFile.type === 'application/pdf' || /\.pdf$/i.test(previewFile.name)) ? (
                <iframe
                  src={previewUrl}
                  title={previewFile.name}
                  className="LeaVerifDocPdfPreview"
                />
              ) : (previewFile.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || /\.docx$/i.test(previewFile.name)) ? (
                docxLoading ? (
                  <div className="LeaVerifDocPlaceholderPreview">
                    <p className="LeaVerifPreviewText">Converting Word document for preview&hellip;</p>
                  </div>
                ) : docxError ? (
                  <div className="LeaVerifDocPlaceholderPreview">
                    <FileText size={48} className="LeaVerifDocPreviewIcon" />
                    <p className="LeaVerifPreviewTitle">Could not render Word preview</p>
                    <p className="LeaVerifPreviewText">Try downloading the document to view its full contents.</p>
                  </div>
                ) : (
                  <div className="LeaVerifDocDocxPreview">
                    <div
                      className="LeaVerifDocxContent"
                      dangerouslySetInnerHTML={{ __html: docxHtml }}
                    />
                  </div>
                )
              ) : (
                <div className="LeaVerifDocPlaceholderPreview">
                  <FileText size={48} className="LeaVerifDocPreviewIcon" />
                  <p className="LeaVerifPreviewTitle">Preview not supported</p>
                  <p className="LeaVerifPreviewText">
                    <strong>{previewFile.name}</strong> can't be previewed inline &mdash; use download instead.
                  </p>
                </div>
              )}
            </div>

            <div className="LeaVerifModalFooter">
              <button type="button" className="LeaVerifBtnOutline" onClick={() => setPreviewFile(null)}>
                Close Preview
              </button>
              <button
                type="button"
                className="LeaVerifBtnPrimary"
                onClick={() => {
                  if (!previewFile) return
                  const url = previewUrl || URL.createObjectURL(previewFile)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = previewFile.name
                  a.click()
                  if (!previewUrl) URL.revokeObjectURL(url)
                }}
              >
                <Download size={14} />
                <span>Download Attachment</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FDA-STYLE FLOATING TOAST NOTIFICATION ALERT */}
      {toast && (
        <div className={`LeaToastAlert LeaToast_${toast.type === 'error' ? 'danger' : toast.type || 'info'}`} role="alert">
          <div className="LeaToastIconWrap">
            {toast.type === 'success' && <CheckCircle size={18} />}
            {toast.type === 'info' && <Info size={18} />}
            {toast.type === 'warning' && <AlertTriangle size={18} />}
            {(toast.type === 'error' || toast.type === 'danger') && <XCircle size={18} />}
          </div>
          <div className="LeaToastBody">
            <p className="LeaToastMessage">{toast.message}</p>
          </div>
          <button
            className="LeaToastCloseBtn"
            onClick={() => setToast(null)}
            aria-label="Close notification"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
export default LeaNewIntake