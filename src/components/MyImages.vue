<template>
  <div id="my-images-section">
    <h3>Mis Imágenes</h3>

    <!-- Subida de imagen -->
    <div class="upload-box">
      <input type="file" ref="fileInput" accept="image/*" @change="handleFileChange" />
      <input type="text" v-model="newTitle" placeholder="Título de la imagen" />
      <button @click="uploadImage" :disabled="uploading">
        {{ uploading ? "Subiendo..." : "Subir imagen" }}
      </button>
    </div>

    <!-- PREVIEW -->
      <div v-if="previewUrl" class="preview-container">
      <p class="preview-title">📸 Imagen a subir</p>

      <div class="preview-card">
        <img :src="previewUrl" />
      </div>
  </div>

    <!-- PROGRESS BAR -->
    <div v-if="uploading" class="progress-box">
      <div class="progress-bar" :style="{ width: progress + '%' }"></div>
    </div>

    <!-- Galería -->
    <div id="my-gallery">
      <div v-if="images.length === 0" class="empty">No tienes imágenes todavía</div>

      <div v-for="img in images" :key="img.id" class="image-card">

        <div class="image-wrapper" @click="openModal(img)">
          <img v-if="img.image_url" :src="img.image_url" />
        </div>

        <div class="title-wrapper">
          <span v-if="!img.editing">{{ img.title || "Sin título" }}</span>
          <input v-else v-model="img.titleEdit" />
          <button v-if="!img.editing" class="icon-btn edit-btn" @click="startEditing(img)">✏️</button>
          <button v-else class="icon-btn save-btn" @click="saveTitle(img)">💾</button>
        </div>

        <button class="delete-btn" @click="deleteImage(img)">Borrar</button>
      </div>
    </div>

    <!-- Modal imagen -->
    <div v-if="modalImage" class="modal" @click.self="closeModal">
      <img :src="modalImage.image_url" class="modal-image" />
      <p class="modal-title">{{ modalImage.title || "Sin título" }}</p>
      <button class="close-btn" @click="closeModal">✖️</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { supabase } from "../supabaseClient";

const user = ref(null);
const images = ref([]);
const fileInput = ref(null);
const newTitle = ref("");
const modalImage = ref(null);
const uploading = ref(false);
const previewUrl = ref(null);
const progress = ref(0);

// --- Cargar usuario ---
async function checkUser() {
  const { data } = await supabase.auth.getSession();
  if (data.session) user.value = data.session.user;
  if (user.value) await loadImages();
}

// --- Cargar imágenes ---
async function loadImages() {
  const { data, error } = await supabase
    .from("user_images")
    .select("*")
    .eq("user_id", user.value.id)
    .order("created_at", { ascending: false });

  if (error) return console.error("Error cargando imágenes:", error);

  images.value = data.map(img => ({ ...img, editing: false, titleEdit: img.title }));
}

// --- PREVIEW ---
function handleFileChange() {
  const file = fileInput.value.files[0];

  if (!file) {
    previewUrl.value = null;
    return;
  }

  previewUrl.value = URL.createObjectURL(file);
}

// --- Subir imagen ---
async function uploadImage() {
  if (!fileInput.value.files[0]) return alert("Selecciona un archivo");

  uploading.value = true;
  progress.value = 0;

  try {
    const file = fileInput.value.files[0];
    const fileName = `${user.value.id}/${Date.now()}-${file.name}`;

    // Simulación de progreso (Supabase no da progreso real)
    const interval = setInterval(() => {
      if (progress.value < 90) progress.value += 10;
    }, 200);

    const { error: storageError } = await supabase.storage
      .from("files")
      .upload(fileName, file);

    clearInterval(interval);
    progress.value = 100;

    if (storageError) throw storageError;

    const { data: urlData } = supabase.storage.from("files").getPublicUrl(fileName);
    const imageUrl = urlData.publicUrl;

    const { error: dbError } = await supabase.from("user_images").insert([
      {
        user_id: user.value.id,
        image_url: imageUrl,
        storage_path: fileName,
        title: newTitle.value || ""
      }
    ]);

    if (dbError) throw dbError;

    alert("✅ Imagen subida correctamente");

    newTitle.value = "";
    fileInput.value.value = null;
    previewUrl.value = null;
    progress.value = 0;

    await loadImages();

  } catch (err) {
    console.error(err);
    alert("Error al subir imagen: " + (err.message || err));
  }

  uploading.value = false;
}

// --- Editar título ---
function startEditing(img) { img.editing = true; }

async function saveTitle(img) {
  const { error } = await supabase
    .from("user_images")
    .update({ title: img.titleEdit })
    .eq("id", img.id);

  if (error) return console.error("Error actualizando título:", error);

  img.title = img.titleEdit;
  img.editing = false;
}

// --- Borrar imagen ---
async function deleteImage(img) {
  if (!confirm("¿Seguro que quieres borrar esta imagen?")) return;

  try {
    const { error: storageError } = await supabase
      .storage
      .from("files")
      .remove([img.storage_path]);

    if (storageError) throw storageError;

    const { error: dbError } = await supabase
      .from("user_images")
      .delete()
      .eq("id", img.id);

    if (dbError) throw dbError;

    await loadImages();
    alert("Imagen borrada correctamente ✅");

  } catch (err) {
    console.error(err);
    alert("Error eliminando imagen: " + (err.message || err));
  }
}

// --- Modal ---
function openModal(img) { modalImage.value = img; }
function closeModal() { modalImage.value = null; }

onMounted(checkUser);
</script>

<style>
.upload-box {
  margin: 10px 0;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.preview-box img {
  width: 120px;
  border-radius: 8px;
  margin-bottom: 10px;
}

.progress-box {
  width: 100%;
  height: 8px;
  background: #333;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 10px;
}

.progress-bar {
  height: 100%;
  background: #4caf50;
  transition: width 0.2s ease;
}

#my-gallery {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.empty { opacity: 0.7; }

.image-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 140px;
}

.image-wrapper {
  width: 120px;
  height: 120px;
  overflow: hidden;
  border-radius: 8px;
  margin-bottom: 5px;
  cursor: pointer;
}

.image-wrapper img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.title-wrapper {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 4px;
}

.title-wrapper input {
  padding: 4px;
  border-radius: 4px;
  border: 1px solid #333;
  width: 80px;
}

.icon-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 1rem;
}

.delete-btn {
  background: #fa4d4d;
  color: #fff;
  border: none;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
}

.modal {
  position: fixed;
  top:0;
  left:0;
  width:100%;
  height:100%;
  background: rgba(0,0,0,0.85);
  display:flex;
  flex-direction: column;
  align-items:center;
  justify-content:center;
  z-index: 9999;
}

.modal-image {
  max-width: 90%;
  max-height: 80%;
  border-radius: 8px;
}

.modal-title {
  color:#fff;
  margin:10px 0;
}

.close-btn {
  background:#fa4d4d;
  color:#fff;
  border:none;
  padding:6px 12px;
  border-radius:6px;
  cursor:pointer;
}

.preview-container {
  margin: 15px 0;
  padding: 12px;
  border: 2px dashed #4caf50;
  border-radius: 10px;
  background: rgba(76, 175, 80, 0.08);
  text-align: center;
}

.preview-title {
  font-weight: bold;
  margin-bottom: 8px;
  color: #4caf50;
}

.preview-card {
  display: inline-block;
  padding: 6px;
  background: #111;
  border-radius: 8px;
}

.preview-card img {
  width: 140px;
  height: 140px;
  object-fit: cover;
  border-radius: 6px;
}
</style>