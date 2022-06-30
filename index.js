const express = require('express')
const { PrismaClient } = require('@prisma/client');
const app = express()
const cors = require('cors');
const prisma = new PrismaClient()
app.use(cors())


//PEGA (ID,NOME,URLIMG, NOME CARGOS) DOS MEMBROS PARA LISTAR NA TELA HOME
app.get('/membros', async (req, res) => {
  const membros = await prisma.membros.findMany({
    select: {
      id: true,
      nome: true,
      url_foto: true,
      cargo: {
        select: {
          nome: true
        }
      }
    },
    orderBy: {
      nome: "asc"
    }
  });
  res.send(membros)
})

//BUSCA OS MEMBROS QUE COMECAO COM O CONTEUDO RETORNADO DO FRONT
app.get('/buscar/:nome', async (req, res) => {
  const {nome} = req.params
  const membros = await prisma.membros.findMany({
    where: {
      nome:{
        startsWith: nome
      }
    },
    select: {
      id: true,
      nome: true,
      url_foto: true,
      cargo: {
        select: {
          nome: true
        }
      }
    },
    orderBy: {
      nome: "asc"
    }
  });
  res.send(membros)
})

//CARREGA TODOS OS CARGOS EXISTENTES
app.get('/cargos', async (req, res) => {
  const cargos = await prisma.cargo.findMany();
  res.send(cargos);
})


//PEGA O MEMBRO SELECIONADO PELO ID
app.get("/membro/:id", async (req, res) => {
  const { id } = req.params;
  const membro = await prisma.membros.findUnique({
    where: {
      id: parseInt(id)
    },
    include: {
      logradouro: {
        select: {
          endereco: true,
          numero: true,
          bairro: true,
          cidade: true
        }
      }
    }
  })
  res.send(membro)
});


app.listen(4041, () => {
  console.log("Servidor Express Funcionando!!")
})
