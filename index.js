const express = require('express')
const { PrismaClient,Prisma } = require('@prisma/client');
const app = express()
const cors = require('cors');
var moment = require('moment');
const prisma = new PrismaClient()
app.use(cors())
app.use(express.json({ limit: '50mb' }))

app.listen(process.env.PORT || 4041,"0.0.0.0", () => {
  console.log("Servidor NodeJs Funcionando!!")
})

//Busca (ID,NOME,URLIMG, NOME CARGOS) DOS MEMBROS PARA LISTAR NA TELA HOME
app.get('/membros', async (req, res) => {
  
  try{
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
  res.json(membros)
}catch(e){
  if (e instanceof Prisma.PrismaClientValidationError) {
    res.json({error:true,msg:"Erro de sintaxe ou campo Obrigatório Vazio!!"})
  }
  if (e instanceof Prisma.PrismaClientInitializationError) {
    res.json({error:true,msg:"Erro de Conexão com o Banco de Dados!!"})
  }
}
})

//BUSCA OS MEMBROS NO CAMPO DE BUSCA DA HOME
app.get('/buscar', async (req, res) => {
  const nome  = req.query.nome
try{
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
  
  res.json(membros)
}
catch(e){
  if (e instanceof Prisma.PrismaClientValidationError) {
    
    res.json({error:true,msg:"Erro de sintaxe ou campo Obrigatório Vazio!!"})
  }
  if (e instanceof Prisma.PrismaClientInitializationError) {
    res.json({error:true,msg:"Erro de Conexão com o Banco de Dados!!"})
  }
}
})
//Busca TODOS OS CARGOS EXISTENTES
app.get('/cargos', async (req, res) => {
  try{
  const cargos = await prisma.cargo.findMany();
  res.json(cargos);
  }
  catch(e){
    if (e instanceof Prisma.PrismaClientValidationError) {
      res.json({error:true,msg:"Erro de sintaxe ou campo Obrigatório Vazio!!"})
    }
    if (e instanceof Prisma.PrismaClientInitializationError) {
      res.json({error:true,msg:"Erro de Conexão com o Banco de Dados!!"})
    }
  }
})
//Busca O MEMBRO SELECIONADO PELO ID
app.get("/membro/:id", async (req, res) => {
  const { id } = req.params;
  try{
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
      },
      cargo:{
        select:{
          nome: true
        }
      }
    }
  })
  res.json(membro)
}
catch(e){
  if (e instanceof Prisma.PrismaClientValidationError) {
    res.json({error:true,msg:"Erro de sintaxe ou campo Obrigatório Vazio!!"})
    console.log(e)
  }
  if (e instanceof Prisma.PrismaClientInitializationError) {
    res.json({error:true,msg:"Erro de Conexão com o Banco de Dados!!"})
  }
}
});
//CADASTRAR NOVO MEMBRO
app.post('/cadastrar', async (req, res) => {
  const membro = req.body
  var nascimento = moment(membro.dtNascimento).format("YYYY-MM-DD")
  var batismo = moment(membro.dtBatismoo).format("YYYY-MM-DD")
  var dtNascimento = new Date(nascimento)
  var dtBatismo = new Date(batismo);

try{
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
          url_foto: membro.url_foto ? membro.url_foto : undefined
        }
      }
    },
    select: {
      id: true
    }
  })
  res.json(response)
}
catch(e){
  if (e instanceof Prisma.PrismaClientValidationError) {
    res.json({error:true,msg:"Erro de sintaxe ou campo Obrigatório Vazio!!"})
  }
  if (e instanceof Prisma.PrismaClientInitializationError) {
    res.json({error:true,msg:"Erro de Conexão com o Banco de Dados!!"})
  }
}

})

//ATUALIZAR OS  DADOS DO MEMBRO 
app.put('/atualizar', async (req, res) => {
  const membro = req.body
  var nascimento = moment(membro.dtNascimento).format("YYYY-MM-DD")
  var batismo = moment(membro.dtBatismo).format("YYYY-MM-DD")
  var dtNascimento = new Date(nascimento)
  var dtBatismo = new Date(batismo);
  try{
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
        update: {
          where: {
            id: membro.id,
          },
          data: {
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
  res.json(response)
}
catch(e){
  if (e instanceof Prisma.PrismaClientValidationError) {
    res.json({error:true,msg:"Erro de sintaxe ou campo Obrigatório Vazio!!"})
  }
  if (e instanceof Prisma.PrismaClientInitializationError) {
    res.json({error:true,msg:"Erro de Conexão com o Banco de Dados!!"})
  }
}
})
//DELETAR O MEMBRO ESCOLHIDO P EDITAR
app.delete('/deletar', async (req, res) => {
  const ids = await req.body
try{
  let response = await prisma.membros.delete({
   where:{
     id: parseInt(ids.id_membro)
   },
   select:{
     id:true
   }
   
  })
  response = await prisma.logradouro.delete({
   where:{
     id: parseInt(ids.id_logradouro) 
   },
   select:{
     id:true
   }
  })
  res.json(response)
}
catch(e){
  if (e instanceof Prisma.PrismaClientValidationError) {
    res.json({error:true,msg:"Erro de sintaxe ou campo Obrigatório Vazio!!"})
  }
  if (e instanceof Prisma.PrismaClientInitializationError) {
    res.json({error:true,msg:"Erro de Conexão com o Banco de Dados!!"})
  }
}
})
