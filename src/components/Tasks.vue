<template>

<div>

<h3>Mis Tareas</h3>

<input
v-model="taskTitle"
type="text"
placeholder="¿Qué hay que hacer hoy?"
>

<input
type="file"
ref="fileInput"
style="font-size:0.8rem;border:dashed 1px var(--border);"
/>

<button @click="addTask">
Añadir Tarea
</button>


<ul id="task-list">

<li v-for="task in tasks" :key="task.id">

<div class="task-content">

<span v-if="editingId !== task.id">
{{ task.title }}
</span>

<input
v-if="editingId === task.id"
v-model="editTitle"
/>

</div>


<div class="task-buttons">

<button
v-if="editingId !== task.id"
class="edit"
@click="startEdit(task)"
>
✏
</button>

<button
v-if="editingId === task.id"
class="save"
@click="saveEdit(task)"
>
💾
</button>

<button
class="delete"
@click="deleteTask(task.id)"
>
🗑
</button>

</div>

</li>

</ul>

</div>

</template>


<script setup>

import { ref } from "vue"
import { supabase } from "../supabaseClient"

const props = defineProps({
tasks: Array
})

const emit = defineEmits(["reload"])

const taskTitle = ref("")
const fileInput = ref(null)

const editingId = ref(null)
const editTitle = ref("")


async function addTask(){

let fileUrl = null

const file = fileInput.value.files[0]

if(file){

const { data, error } = await supabase.storage
.from("files")
.upload(`tasks/${Date.now()}-${file.name}`, file)

if(error){
alert(error.message)
return
}

const { data: urlData } = supabase
.storage
.from("files")
.getPublicUrl(data.path)

fileUrl = urlData.publicUrl
}

const { error } = await supabase
.from("tasks")
.insert({
title: taskTitle.value,
file_url: fileUrl
})

if(error){
alert(error.message)
return
}

taskTitle.value = ""
fileInput.value.value = ""

emit("reload")

}


function startEdit(task){

editingId.value = task.id
editTitle.value = task.title

}


async function saveEdit(task){

const { error } = await supabase
.from("tasks")
.update({ title: editTitle.value })
.eq("id", task.id)

if(error){
alert(error.message)
return
}

editingId.value = null

emit("reload")

}


async function deleteTask(id){

if(!confirm("¿Eliminar tarea?")) return

const { error } = await supabase
.from("tasks")
.delete()
.eq("id", id)

if(error){
alert(error.message)
return
}

emit("reload")

}

</script>


<style>

#task-list{
list-style:none;
padding:0;
margin-top:20px;
}

#task-list li{
background:#262626;
margin-bottom:10px;
padding:14px 18px;
border-radius:10px;
display:flex;
justify-content:space-between;
align-items:center;
border:1px solid var(--border);
}

.task-content{
flex:1;
}

.task-buttons{
display:flex;
gap:6px;
}

.task-buttons button{
width:auto;
padding:6px 10px;
font-size:14px;
cursor:pointer;
border-radius:6px;
}

.edit{
background:var(--primary);
}

.save{
background:#4cc9f0;
}

.delete{
background:var(--danger);
color:white;
}

</style>