const express = require('express')
const { PrismaClient } = require('@prisma/client');
const app = express()
const cors = require('cors');
var moment = require('moment');
const prisma = new PrismaClient()
app.use(cors())
app.use(express.json({ limit: '50mb' }))

app.listen(4041, () => {
  console.log("Servidor Express Funcionando!!")
})

//Busca (ID,NOME,URLIMG, NOME CARGOS) DOS MEMBROS PARA LISTAR NA TELA HOME
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
  const { nome } = req.params
  const membros = await prisma.membros.findMany({
    where: {
      nome: {
        startsWith: nome,
        mode: 'insensitive'
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

//Busca TODOS OS CARGOS EXISTENTES
app.get('/cargos', async (req, res) => {
  const cargos = await prisma.cargo.findMany();
  res.send(cargos);
})

//Busca O MEMBRO SELECIONADO PELO ID
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

app.post('/cadastrar', async (req, res) => {
  const membro = req.body
  var nascimento = moment(membro.dtNascimento).format("YYYY-MM-DD")
  var batismo = moment(membro.dtBatismo).format("YYYY-MM-DD")
  var dtNascimento = new Date(nascimento)
  var dtBatismo = new Date(batismo);


  const response = await prisma.logradouro.create({
    data: {
      endereco: membro.endereco,
      numero: parseInt(membro.numero),
      bairro: membro.bairro,
      cidade: membro.cidade,
      membros: {
        create: {
          nome: membro.nome,
          telefone: membro.telefone,
          pai: membro.pai,
          mae: membro.mae,
          dtNascimento: dtNascimento,
          dtBatismo: dtBatismo,
          estCivil: membro.estCivil,
          id_cargo: membro.id_cargo,
          url_foto:membro.url_foto ? membro.url_foto : undefined
        }
      }
    },
    select: {
      id: true
    }
  })
  res.send(response)

})

//ATUALIZAR OS  DADOS DO MEMBRO 
app.put('/atualizar', async (req, res) => {
  const membro = req.body
  var nascimento = moment(membro.dtNascimento).format("YYYY-MM-DD")
  var batismo = moment(membro.dtBatismo).format("YYYY-MM-DD")
  var dtNascimento = new Date(nascimento)
  var dtBatismo = new Date(batismo);
  const response = await prisma.logradouro.update({
    where: {
      id: parseInt(membro.id_logradouro)
    },
    data: {
      endereco: membro.endereco,
      numero: parseInt(membro.numero),
      bairro: membro.bairro,
      cidade: membro.cidade,
      membros: {
        update:{
          where: {
            id: membro.id,
          },
          data:{
            nome: membro.nome,
            telefone: membro.telefone,
            pai: membro.pai,
            mae: membro.mae,
            dtNascimento: dtNascimento,
            dtBatismo: dtBatismo,
            estCivil: membro.estCivil,
            id_cargo: membro.id_cargo,
            url_foto: membro.url_foto ? membro.url_foto : undefined
          }
        }
      }
    },
    select: {
      id: true
    }

  })
res.send(response)
  })

app.delete('/deletar',async(req,res) =>{
  const ids = req.body

  console.log(ids)
 /*const id_log = req.query.id_logradouro;
 const id_membro = req.query.id_membro;

 console.log(id_membro)
 let response = await prisma.membros.delete({
  where:{
    id: parseInt(id_membro)
  },
  select:{
    id:true
  }
  
 })
 response = await prisma.logradouro.delete({
  where:{
    id: parseInt(id_log) 
  },
  select:{
    id:true
  }
 })

 res.send(response)
 */
})
