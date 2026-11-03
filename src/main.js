
import './style.css'
import { supabase } from './supabase.js'

document.querySelector('#app').innerHTML = `
  <header>
    <h2>aayushma.</h2>
    <p> post whateva u want to</p>
  </header>

  <main>
    <section class="posting" id="dropZone">
      <h2>Share something.</h2>

      <textarea
        id="postText"
        placeholder="A thought, a quote, anything..."
      ></textarea>

      <div class="drop-area">
        <p>Drag an image here, paste with Ctrl + V, or</p>
        <label for="imageInput">＋ Browse images</label>
        <input type="file" id="imageInput" accept="image/*">
        <p id="imageStatus">No image selected</p>
        <img id="imagePreview" alt="Image preview">
        <button id="removeImage" type="button">Remove image</button>
      </div>

      <div class="post-actions">
        <button id="postButton">Post</button>
      </div>
    </section>

    <h2 class="feed-title">Explore</h2>
    <section id="feed" class="feed"></section>
  </main>
`

const postButton = document.querySelector('#postButton')
const postText = document.querySelector('#postText')
const imageInput = document.querySelector('#imageInput')
const feed = document.querySelector('#feed')
const dropZone = document.querySelector('#dropZone')
const imageStatus = document.querySelector('#imageStatus')
const imagePreview = document.querySelector('#imagePreview')
const removeImageButton = document.querySelector('#removeImage')

let selectedImage = null
let previewUrl = null

// Select an image
function selectImage(file) {
  if (!file || !file.type.startsWith('image/')) return

  selectedImage = file

  if (previewUrl) URL.revokeObjectURL(previewUrl)

  previewUrl = URL.createObjectURL(file)
  imagePreview.src = previewUrl
  imagePreview.style.display = 'block'

  imageStatus.textContent = `Selected: ${file.name}`
  removeImageButton.style.display = 'inline-block'
}

// Remove selected image
function removeImage() {
  selectedImage = null
  imageInput.value = ''

  if (previewUrl) URL.revokeObjectURL(previewUrl)

  previewUrl = null
  imagePreview.removeAttribute('src')
  imagePreview.style.display = 'none'

  imageStatus.textContent = 'No image selected'
  removeImageButton.style.display = 'none'
}

imageInput.addEventListener('change', () => {
  selectImage(imageInput.files[0])
})

removeImageButton.addEventListener('click', removeImage)

// Drag and drop
dropZone.addEventListener('dragover', (event) => {
  event.preventDefault()
  dropZone.classList.add('dragging')
})

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('dragging')
})

dropZone.addEventListener('drop', (event) => {
  event.preventDefault()
  dropZone.classList.remove('dragging')
  selectImage(event.dataTransfer.files[0])
})

// Paste images
document.addEventListener('paste', (event) => {
  const items = event.clipboardData.items

  for (const item of items) {
    if (item.type.startsWith('image/')) {
      selectImage(item.getAsFile())
      break
    }
  }
})

// Display saved posts
async function loadPosts() {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Loading error:', error)
    alert('Could not load posts. Check the browser console.')
    return
  }

  feed.innerHTML = ''

  data.forEach(post => {
    const card = document.createElement('article')
    card.className = 'card'

    if (post.image_url) {
      const img = document.createElement('img')
      img.src = post.image_url
      img.className = 'post-image'
      img.alt = 'Shared image'
      card.appendChild(img)
    }

    if (post.content) {
      const caption = document.createElement('p')
      caption.className = 'post-content'
      caption.textContent = post.content
      card.appendChild(caption)
    }

    // Posting date
    const date = document.createElement('span')
    date.className = 'post-date'

    date.textContent = new Date(post.created_at).toLocaleDateString(
      'en-US',
      {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }
    )

    card.appendChild(date)
    feed.appendChild(card)
  })
}

// Publish a post
postButton.addEventListener('click', async () => {
  const text = postText.value.trim()
  const image = selectedImage

  if (!text && !image) {
    alert('Write something or choose an image!')
    return
  }

  postButton.disabled = true
  postButton.textContent = 'Posting...'

  try {
    let imageUrl = null

    // Upload image to Supabase
    if (image) {
      const filePath = `${crypto.randomUUID()}.${image.name.split('.').pop()}`

      const { error: uploadError } = await supabase
        .storage
        .from('post-images')
        .upload(filePath, image)

      if (uploadError) throw uploadError

      const { data } = supabase
        .storage
        .from('post-images')
        .getPublicUrl(filePath)

      imageUrl = data.publicUrl
    }

    // Save post information
    const { error: insertError } = await supabase
      .from('posts')
      .insert({
        content: text || null,
        image_url: imageUrl
      })

    if (insertError) throw insertError

    postText.value = ''
    removeImage()

    await loadPosts()

  } catch (error) {
    console.error('Posting error:', error)
    alert('Something went wrong. Check the browser console.')
  } finally {
    postButton.disabled = false
    postButton.textContent = 'Post'
  }
})

// Load posts when the website opens
loadPosts()
