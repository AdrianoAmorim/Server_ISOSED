const express = require('express')
const { PrismaClient, Prisma } = require('@prisma/client');
const app = express()
const cors = require('cors');
var moment = require('moment');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = new PrismaClient();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

//MIDDLE PARA CHECAR O TOKEN DE ACESSO AS ROTAS
function checarToken(req, res, next) {
  //pega do header o token passado pelo frontend
  const authHeader = req.headers['authorization'];
  //separa a nomenclatura token do hash(token)
  const token = authHeader && authHeader.split(' ')[1];
  //validacao e teste do token
  if(token == null) {
    console.log("to no null")
    return res.json({ aviso: true, msg: "Acesso Negado" })
  }else{
    try {
      const secret = process.env.SECRET
      jwt.verify(token, secret)
      next()
    } catch (e) {
      return res.json({ error: true, msg: "Acesso Negado - Token inválido!" })
    }
  }
}
//------------------------------------------


//CADASTRAR O USUARIO DO SISTEMA
app.post('/cad_usuario', async (req, res) => {
  const { nome, password } = req.body;

  //VALIDA AS INFORMACOES - SE NAO ESTAO VAZIAS
  if (!nome) {
    return res.json({ msg: "Campo Usuário obrigatório!" })
  } if (!password) {
    return res.json({ msg: "Campo Senha Obrigatório" })
  } else {
    //Dificultar ainda mais a senha - coloca digitos a mais
    const salt = await bcrypt.genSalt(8);
    //Cria o hash da senha com a senha do usuairo e o dificultador
    const passwordHash = await bcrypt.hash(password, salt);

    try {
      //FAZ UMA CONSULTA PARA VALIDAR SE O USUARIO NAO EXISTE
      const usuarioExiste = await prisma.usuarios.findMany({
        where: {
          nome: {
            equals: nome
          }
        },
        select: {
          id: true
        }
      })
      console.log(usuarioExiste.length)
      //SE NAO EXISTIR CRIA O USUARIO NO BANCO
      if (usuarioExiste.length == 0) {
        const response = await prisma.usuarios.create({
          data: {
            nome: nome,
            password: passwordHash
          },
          select: {
            id: true
          }
        })
        return res.json({ msg: response })
      } else {
        return res.json({ msg: "Usuário existente, Favor escolha outro usuário!" })
      }

    } catch (e) {
      console.log(e)
      return res.json({ msg: "Houve um erro No cadastro de Novo Usuario: " + e.message })
    }

  }
})

//LOGAR E GERAR O TOKEN DO USUARIO
app.post('/login', async (req, res) => {
  const { nome, password } = req.body;
  //VALIDA AS INFORMACOES - SE NAO ESTAO VAZIAS
  if (!nome) {
    return res.json({ aviso: true, msg: "Campo Usuário obrigatório!" })
  }
  if (!password) {
    return res.json({ aviso: true, msg: "Campo Senha Obrigatório" })
  }

  //requisicao CHECKA SE EXISTE O USUARIO

  const usuarioExiste = await prisma.usuarios.findFirst({
    where: {
      nome: {
        equals: nome
      }
    }
  })

  //CHECA SE O USUARIO EXISTE SE EXISTE CHECA SE A SENHA ESTA CORRETA 
  if (!usuarioExiste) {
    return res.json({ aviso: true, msg: "Usuario nao Encontrado!!" })
  } else {
    //CHECA A SENHA SE ESTA CORRETA
    const passwordChecked = await bcrypt.compare(password, usuarioExiste.password);
    if (!passwordChecked) {
      return res.json({ aviso: true, msg: "senha incorreta" })
    }
  }

  //criar o token para enviar pro front
  try {
    //passa a hash criada por nos no .env
    const secret = process.env.SECRET;
    //cria o token com o id do usuario e o secret criado por nos
    const token = jwt.sign({
      id: usuarioExiste.id
    },
      secret
    )
    return res.json({ msg: "Bem-vindo " + usuarioExiste.nome, token })
  } catch (e) {
    return res.json({ error: true, msg: "Houve Um erro na autenticação do Usuário!" })
  }

})


//RETORNA OS ANIVERSARIANTES DO MES SELECIONADO
app.get('/aniversariantes',checarToken, async (req, res) => {
  //inicia as variaveis com os dias inicial e final do mes
  var dataInicial = "-01";
  var dataFinal = "-0";
  //pega o mes escolhido pelo usuario
  const mes = req.query.mes
  //gera uma instancia da data atual
  const dataAtual = new Date();
  //pega o ano da instancia da data
  const anoAtual = dataAtual.getFullYear();
  //pega os dias desta data passada no parametro(colocando 0 retorna o total de dias)
  const data = new Date(anoAtual, mes, 0).getDate()
  //monta a data inicial com as informacoes obtida
  dataInicial = dataInicial.substring(0, 0) + anoAtual + "-" + mes + dataInicial

  //faz o teste pra saber quantos dias tem o mes escolhido..e monta a data final
  if (data == 31) {
    dataFinal = "-31"
    dataFinal = dataFinal.substring(0, 0) + anoAtual + "-" + mes + dataFinal
  } else if (data == 30) {
    dataFinal = "-30"
    dataFinal = dataFinal.substring(0, 0) + anoAtual + "-" + mes + dataFinal
  } else if (data == 27) {
    dataFinal = "-27"
    dataFinal = dataFinal.substring(0, 0) + anoAtual + "-" + mes + dataFinal
  } else if (data == 28) {
    dataFinal = "-28"
    dataFinal = dataFinal.substring(0, 0) + anoAtual + "-" + mes + dataFinal
  }

  try {
    const qtdMembro = await prisma.membros.findMany({
      where: {
        dtNascimento: {
          gte: new Date(dataInicial),
          lte: new Date(dataFinal),
        }
      },
      select: {
        id: true,
        nome: true,
        dtNascimento: true,
        cargo: {
          select: {
            nome: true
          }
        },
        congregacao: {
          select: {
            nome: true
          }
        }
      },
      orderBy: {
        nome: "asc"
      }

    })
    return res.json(qtdMembro);

  } catch (e) {
    console.log(e)
    return res.json({error: true, msg:"error: " + e.message})
  }


})

//BUSCA UMA LISTA DE MEMBROS FILTRANDO POR CARGO OU CONGREGACAO
app.get('/relatorio_membros_cargo',checarToken, async (req, res) => {
  const idCargo = req.query.idCargo;
  try {
    const listaMembros = await prisma.membros.findMany({
      where: {
        id_cargo: parseInt(idCargo)
      },
      select: {
        id: true,
        nome: true,
        telefone: true,
        cargo: {
          select: {
            nome: true
          }
        },
        congregacao: {
          select: {
            nome: true
          }
        }
      },
      orderBy: {
        nome: "asc"
      }
    })
    res.json(listaMembros)
  } catch (e) {
    if (e instanceof Prisma.PrismaClientValidationError) {
      res.json({ error: true, msg: "Erro de sintaxe ou campo Obrigatório Vazio!!" })
    }
    if (e instanceof Prisma.PrismaClientInitializationError) {
      res.json({ error: true, msg: "Erro de Conexão com o Banco de Dados!!" })
    } else {
      res.json({ error: true, msg: e })
    }
  }
})

app.get('/relatorio_membros_congregacao',checarToken, async (req, res) => {
  const idCongregacao = req.query.idCongregacao;
  try {
    const listaMembros = await prisma.membros.findMany({
      where: {
        id_congregacao: parseInt(idCongregacao)
      },
      select: {
        id: true,
        nome: true,
        telefone: true,
        cargo: {
          select: {
            nome: true
          }
        },
        congregacao: {
          select: {
            nome: true
          }
        }
      },
      orderBy: {
        nome: "asc"
      }
    })
    res.json(listaMembros)
  } catch (e) {
    if (e instanceof Prisma.PrismaClientValidationError) {
      res.json({ error: true, msg: "Erro de sintaxe ou campo Obrigatório Vazio!!" })
    }
    if (e instanceof Prisma.PrismaClientInitializationError) {
      res.json({ error: true, msg: "Erro de Conexão com o Banco de Dados!!" })
    } else {
      res.json({ error: true, msg: e })
    }
  }
})

//BUSCA A LISTA DE MEMBROS CADASTRADOS POR CARGO + CONGREGACOES
app.get('/relatorio_membros_congregacao_cargo',checarToken, async (req, res) => {
  const id_cargo = req.query.idCargo;
  const id_congregacao = req.query.idCongregacao;
  try {
    const listaMembros = await prisma.membros.findMany({
      where: {
        AND: [{
          id_cargo: {
            equals: parseInt(id_cargo)
          }
        },
        {
          id_congregacao: {
            equals: parseInt(id_congregacao)
          }
        }]
      },
      select: {
        id: true,
        nome: true,
        telefone: true,
        cargo: {
          select: {
            nome: true
          }
        },
        congregacao: {
          select: {
            nome: true
          }
        }
      },
      orderBy: {
        nome: "asc"
      }
    })
    res.json(listaMembros)
  } catch (e) {
    if (e instanceof Prisma.PrismaClientValidationError) {
      res.json({ error: true, msg: "Erro de sintaxe ou campo Obrigatório Vazio!!" })
    }
    if (e instanceof Prisma.PrismaClientInitializationError) {
      res.json({ error: true, msg: "Erro de Conexão com o Banco de Dados!!" })
    } else {
      res.json({ error: true, msg: e })
    }
  }
})

//BUSCA A QUANTIDADE DE MEMBROS CADASTRADOS FILTRANDO POR CARGO E CONGREGACAO
app.get('/relatorio_qtdMembros_cargo_congregacao',checarToken, async (req, res) => {
  const id_cargo = req.query.idCargo
  const id_congregacao = req.query.idCongregacao
  console.log(id_cargo)
  console.log(id_congregacao)
  try {
    const qtdMembros = await prisma.membros.count({
      where: {
        AND: [{
          id_cargo: {
            equals: parseInt(id_cargo)
          }
        },
        {
          id_congregacao: {
            equals: parseInt(id_congregacao)
          }
        }]
      },
      select: {
        _all: true
      },

    })
    res.json(qtdMembros)
  } catch (e) {
    if (e instanceof Prisma.PrismaClientValidationError) {
      res.json({ error: true, msg: "Erro de sintaxe ou campo Obrigatório Vazio!!" })
    }
    if (e instanceof Prisma.PrismaClientInitializationError) {
      res.json({ error: true, msg: "Erro de Conexão com o Banco de Dados!!" })
    } else {
      res.json({ error: true, msg: e })
    }
  }
})

//BUSCA A QUANTIDADE DE MEMBROS CADASTRADOS FILTRANDO POR CARGO
app.get('/relatorio_qtdMembros_cargo',checarToken, async (req, res) => {
  const idCargo = req.query.id
  console.log(idCargo)
  try {
    const qtdMembro = await prisma.membros.count({
      where: {
        id_cargo: parseInt(idCargo)
      },
      select: {
        _all: true
      }
    })
    res.json(qtdMembro)
  } catch (e) {
    if (e instanceof Prisma.PrismaClientValidationError) {
      res.json({ error: true, msg: "Erro de sintaxe ou campo Obrigatório Vazio!!" })
    }
    if (e instanceof Prisma.PrismaClientInitializationError) {
      res.json({ error: true, msg: "Erro de Conexão com o Banco de Dados!!" })
    } else {
      res.json({ error: true, msg: e })
    }
  }
})

//BUSCA A QUANTIDADE DE MEMBROS CADASTRADOS FILTRANDO POR CONGREGACAO
app.get('/relatorio_qtdMembros_congregacao',checarToken, async (req, res) => {
  const idCongregacao = req.query.id;
  try {
    const qtdMembro = await prisma.membros.count({
      where: {
        id_congregacao: parseInt(idCongregacao)
      },
      select: {
        _all: true
      }
    })
    res.json(qtdMembro)
  } catch (e) {
    if (e instanceof Prisma.PrismaClientValidationError) {
      res.json({ error: true, msg: "Erro de sintaxe ou campo Obrigatório Vazio!!" })
    }
    if (e instanceof Prisma.PrismaClientInitializationError) {
      res.json({ error: true, msg: "Erro de Conexão com o Banco de Dados!!" })
    } else {
      res.json({ error: true, msg: e })
    }
  }
})

//Busca a Quantidade de Membros Cadastrado
app.get('/relatorio_qtdMembros',checarToken, async (req, res) => {
  try {
    const qtdMembro = await prisma.membros.count({
      select: {
        _all: true
      }
    })
    res.json(qtdMembro)
  } catch (e) {
    if (e instanceof Prisma.PrismaClientValidationError) {
      res.json({ error: true, msg: "Erro de sintaxe ou campo Obrigatório Vazio!!" })
    }
    if (e instanceof Prisma.PrismaClientInitializationError) {
      res.json({ error: true, msg: "Erro de Conexão com o Banco de Dados!!" })
    } else {
      res.json({ error: true, msg: e })
    }
  }
})

//Busca (ID,NOME,URLIMG, NOME CARGOS) DOS MEMBROS PARA LISTAR NA TELA HOME
app.get('/membros', checarToken, async (req, res) => {

  try {
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
  } catch (e) {
    if (e instanceof Prisma.PrismaClientValidationError) {
      res.json({ error: true, msg: "Erro de sintaxe ou campo Obrigatório Vazio!!" })
    }
    if (e instanceof Prisma.PrismaClientInitializationError) {
      res.json({ error: true, msg: "Erro de Conexão com o Banco de Dados!!" })
    } else {
      res.json({ error: true, msg: e })
    }
  }
})

//BUSCAR CONGREGACAO OU CARGO NA CONFIGURAÇÃO
app.get('/buscarCongregacoes',checarToken, async (req, res) => {
  const nomeItem = req.query.nome;
  try {
    const congregacoes = await prisma.congregacao.findMany({
      where: {
        nome: {
          startsWith: nomeItem,
          mode: 'insensitive'
        },
        id: {
          not: 1
        }
      },
      select: {
        id: true,
        nome: true
      },
      orderBy: {
        nome: "asc"
      }
    })
    res.json(congregacoes)
  } catch (e) {
    if (e instanceof Prisma.PrismaClientValidationError) {

      res.json({ error: true, msg: "Erro de sintaxe ou campo Obrigatório Vazio!!" })
    }
    if (e instanceof Prisma.PrismaClientInitializationError) {
      res.json({ error: true, msg: "Erro de Conexão com o Banco de Dados!!" })
    } else {
      res.json({ error: true, msg: e })
    }
  }
})

app.get('/buscarCargos',checarToken, async (req, res) => {
  const nomeItem = req.query.nome;
  try {
    const cargos = await prisma.cargo.findMany({
      where: {
        nome: {
          startsWith: nomeItem,
          mode: 'insensitive'
        },
        id: {
          not: 1
        }
      },
      select: {
        id: true,
        nome: true
      },
      orderBy: {
        nome: "asc"
      }
    })
    res.json(cargos)
  } catch (e) {
    if (e instanceof Prisma.PrismaClientValidationError) {

      res.json({ error: true, msg: "Erro de sintaxe ou campo Obrigatório Vazio!!" })
    }
    if (e instanceof Prisma.PrismaClientInitializationError) {
      res.json({ error: true, msg: "Erro de Conexão com o Banco de Dados!!" })
    } else {
      res.json({ error: true, msg: e })
    }
  }
})

//BUSCA OS MEMBROS NO CAMPO DE BUSCA DA HOME
app.get('/buscar',checarToken, async (req, res) => {
  const nome = req.query.nome
  try {
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
  catch (e) {
    if (e instanceof Prisma.PrismaClientValidationError) {

      res.json({ error: true, msg: "Erro de sintaxe ou campo Obrigatório Vazio!!" })
    }
    if (e instanceof Prisma.PrismaClientInitializationError) {
      res.json({ error: true, msg: "Erro de Conexão com o Banco de Dados!!" })
    } else {
      res.json({ error: true, msg: e })
    }
  }
})
//BUSCA TODOS OS CARGOS E CONGREGACOES EXISTENTES
app.get('/cargos', checarToken, async (req, res) => {
  try {
    const cargos = await prisma.cargo.findMany({
      orderBy: {
        nome: "asc"
      }
    }

    );
    res.json(cargos);
  }
  catch (e) {
    if (e instanceof Prisma.PrismaClientValidationError) {
      res.json({ error: true, msg: "Erro de sintaxe ou campo Obrigatório Vazio!!" })
    }
    if (e instanceof Prisma.PrismaClientInitializationError) {
      res.json({ error: true, msg: "Erro de Conexão com o Banco de Dados!!" })
    } else {
      res.json({ error: true, msg: e })
    }
  }
})
app.get('/congregacoes',checarToken, async (req, res) => {
  try {
    const congregacoes = await prisma.congregacao.findMany({
      orderBy: {
        nome: "asc"
      }
    });
    res.json(congregacoes);
  }
  catch (e) {
    if (e instanceof Prisma.PrismaClientValidationError) {
      res.json({ error: true, msg: "Erro de sintaxe ou campo Obrigatório Vazio!!" })
    }
    if (e instanceof Prisma.PrismaClientInitializationError) {
      res.json({ error: true, msg: "Erro de Conexão com o Banco de Dados!!" })
    } else {
      res.json({ error: true, msg: e })
    }
  }
})
//Busca TODOS OS CARGOS ou congregacoes EXISTENTES exceto a id1 Default
app.get('/configCargos',checarToken, async (req, res) => {
  try {
    const cargos = await prisma.cargo.findMany({
      where: {
        id: {
          not: 1
        }
      },
      orderBy: {
        nome: "asc"
      }
    }

    );
    res.json(cargos);
  }
  catch (e) {
    if (e instanceof Prisma.PrismaClientValidationError) {
      res.json({ error: true, msg: "Erro de sintaxe ou campo Obrigatório Vazio!!" })
    }
    if (e instanceof Prisma.PrismaClientInitializationError) {
      res.json({ error: true, msg: "Erro de Conexão com o Banco de Dados!!" })
    } else {
      res.json({ error: true, msg: e })
    }
  }
})

app.get('/configCongregacoes',checarToken, async (req, res) => {
  try {
    const congregacoes = await prisma.congregacao.findMany({
      where: {
        id: {
          not: 1
        }
      },
      orderBy: {
        nome: "asc"
      }
    });
    res.json(congregacoes);
  }
  catch (e) {
    if (e instanceof Prisma.PrismaClientValidationError) {
      res.json({ error: true, msg: "Erro de sintaxe ou campo Obrigatório Vazio!!" })
    }
    if (e instanceof Prisma.PrismaClientInitializationError) {
      res.json({ error: true, msg: "Erro de Conexão com o Banco de Dados!!" })
    } else {
      res.json({ error: true, msg: e })
    }
  }
})

//Busca O MEMBRO SELECIONADO PELO ID
app.get("/membro/:id",checarToken, async (req, res) => {
  const { id } = req.params;
  try {
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
        cargo: {
          select: {
            nome: true
          }
        },
        congregacao: {
          select: {
            nome: true
          }
        }
      }
    })
    res.json(membro)
  }
  catch (e) {
    if (e instanceof Prisma.PrismaClientValidationError) {
      res.json({ error: true, msg: "Erro de sintaxe ou campo Obrigatório Vazio!!" })
      console.log(e)
    }
    if (e instanceof Prisma.PrismaClientInitializationError) {
      res.json({ error: true, msg: "Erro de Conexão com o Banco de Dados!!" })
    } else {
      res.json({ error: true, msg: e })
    }
  }
});

//CADASTRAR NOVO cargo
app.post('/cadCargo',checarToken, async (req, res) => {
  const cargo = req.body
  try {
    const response = await prisma.cargo.create({
      data: {
        nome: cargo.nome
      },
      select: {
        id: true
      }
    })
    res.json(response)
  } catch (e) {
    if (e instanceof Prisma.PrismaClientValidationError) {
      res.json({ error: true, msg: "Erro de sintaxe ou campo Obrigatório Vazio!!" })
    }
    if (e instanceof Prisma.PrismaClientInitializationError) {
      res.json({ error: true, msg: "Erro de Conexão com o Banco de Dados!!" })
    } else {
      res.json({ error: true, msg: e })
    }
  }
});

//CADASTRAR NOVA CONGREGAÇÃO
app.post('/cadCongregacao',checarToken, async (req, res) => {
  const congregacao = req.body
  try {
    const response = await prisma.congregacao.create({
      data: {
        nome: congregacao.nome
      },
      select: {
        id: true
      }
    })
    res.json(response)

  } catch (e) {
    if (e instanceof Prisma.PrismaClientValidationError) {
      res.json({ error: true, msg: "Erro de sintaxe ou campo Obrigatório Vazio!!" })
    }
    if (e instanceof Prisma.PrismaClientInitializationError) {
      res.json({ error: true, msg: "Erro de Conexão com o Banco de Dados!!" })
    } else {
      res.json({ error: true, msg: e })
    }
  }
});

//CADASTRAR NOVO MEMBRO
app.post('/cadastrar',checarToken, async (req, res) => {
  const membro = req.body
  var nascimento = moment(membro.dtNascimento).format("YYYY-MM-DD")
  var batismo = moment(membro.dtBatismoo).format("YYYY-MM-DD")
  var dtNascimento = new Date(nascimento)
  var dtBatismo = new Date(batismo);

  try {
    const response = await prisma.logradouro.create({
      data: {
        endereco: membro.endereco,
        numero: membro.numero,
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
            id_congregacao: membro.id_congregacao,
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
  catch (e) {
    if (e instanceof Prisma.PrismaClientValidationError) {
      res.json({ error: true, msg: "Erro de sintaxe ou campo Obrigatório Vazio!!" })
    }
    if (e instanceof Prisma.PrismaClientInitializationError) {
      res.json({ error: true, msg: "Erro de Conexão com o Banco de Dados!!" })
    } else {
      res.json({ error: true, msg: e })
    }
  }

})

//ATUALIZAR OS  DADOS DO MEMBRO 
app.put('/atualizar',checarToken, async (req, res) => {
  const membro = req.body
  var nascimento = moment(membro.dtNascimento).format("YYYY-MM-DD")
  var batismo = moment(membro.dtBatismo).format("YYYY-MM-DD")
  var dtNascimento = new Date(nascimento)
  var dtBatismo = new Date(batismo);
  try {
    const response = await prisma.logradouro.update({
      where: {
        id: parseInt(membro.id_logradouro)
      },
      data: {
        endereco: membro.endereco,
        numero: membro.numero,
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
              id_congregacao: membro.id_congregacao,
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
  catch (e) {
    if (e instanceof Prisma.PrismaClientValidationError) {
      res.json({ error: true, msg: "Erro de sintaxe ou campo Obrigatório Vazio!!" })
    }
    if (e instanceof Prisma.PrismaClientInitializationError) {
      res.json({ error: true, msg: "Erro de Conexão com o Banco de Dados!!" })
    } else {
      res.json({ error: true, msg: e })
    }
  }
})

//ATUALIZAR O CARGO E A CONGREGACAO
app.put('/atualizarCongregacao',checarToken, async (req, res) => {
  const congregacao = req.body
  try {
    const response = await prisma.congregacao.update({
      where: {
        id: parseInt(congregacao.id)
      },
      data: {
        nome: congregacao.nome
      },
      select: {
        id: true
      }
    })
    res.json(response)
  }
  catch (e) {
    if (e instanceof Prisma.PrismaClientValidationError) {
      res.json({ error: true, msg: "Erro de sintaxe ou campo Obrigatório Vazio!!" })
    }
    if (e instanceof Prisma.PrismaClientInitializationError) {
      res.json({ error: true, msg: "Erro de Conexão com o Banco de Dados!!" })
    } else {
      res.json({ error: true, msg: e })
    }
  }
})

app.put('/atualizarCargo',checarToken, async (req, res) => {
  const cargo = req.body
  try {
    const response = await prisma.cargo.update({
      where: {
        id: parseInt(cargo.id)
      },
      data: {
        nome: cargo.nome
      },
      select: {
        id: true
      }
    })
    res.json(response)
  }
  catch (e) {
    if (e instanceof Prisma.PrismaClientValidationError) {
      res.json({ error: true, msg: "Erro de sintaxe ou campo Obrigatório Vazio!!" })
    }
    if (e instanceof Prisma.PrismaClientInitializationError) {
      res.json({ error: true, msg: "Erro de Conexão com o Banco de Dados!!" })
    } else {
      res.json({ error: true, msg: e })
    }
  }
})

//DELETAR CARGO E CONGREGACAO
app.delete('/deletarCongregacao',checarToken, async (req, res) => {
  const id = req.body
  var responseConsulta = null;
  var resultFor = null;
  try {
    responseConsulta = await prisma.membros.findMany({
      where: {
        id_congregacao: parseInt(id.id_congregacao)
      },
      select: {
        id: true
      }
    });
    if (responseConsulta.length > 0) {
      for (var i = 0; i < responseConsulta.length; i++) {
        resultFor = await prisma.membros.update({
          where: {
            id: parseInt(responseConsulta[i].id)
          },
          data: {
            id_congregacao: 1
          },
          select: {
            id: true
          }

        })
      }
      if (resultFor.id > 0) {
        responseConsulta = await prisma.congregacao.delete({
          where: {
            id: parseInt(id.id_congregacao)
          },
          select: {
            id: true
          }
        })
      } else {
        res.json({ msg: "Erro ao Atualizar a Congregação deste Membro" })
      }
    } else {
      responseConsulta = await prisma.congregacao.delete({
        where: {
          id: parseInt(id.id_congregacao)
        },
        select: {
          id: true
        }

      })
    }
    res.json(responseConsulta)
  } catch (e) {
    if (e instanceof Prisma.PrismaClientValidationError) {
      res.json({ error: true, msg: "Erro de sintaxe ou campo Obrigatório Vazio!!" })
    }
    if (e instanceof Prisma.PrismaClientInitializationError) {
      res.json({ error: true, msg: "Erro de Conexão com o Banco de Dados!!" })
    } else {
      res.json({ error: true, msg: e })
    }
  }
})

app.delete('/deletarCargo',checarToken, async (req, res) => {
  const id = req.body
  var responseConsulta = null;
  var resultFor = null;
  try {
    responseConsulta = await prisma.membros.findMany({
      where: {
        id_cargo: parseInt(id.id_cargo)
      },
      select: {
        id: true
      }
    });
    if (responseConsulta.length > 0) {
      for (var i = 0; i < responseConsulta.length; i++) {
        resultFor = await prisma.membros.update({
          where: {
            id: parseInt(responseConsulta[i].id)
          },
          data: {
            id_cargo: 1
          },
          select: {
            id: true
          }

        })
      }
      if (resultFor.id > 0) {
        responseConsulta = await prisma.cargo.delete({
          where: {
            id: parseInt(id.id_cargo)
          },
          select: {
            id: true
          }
        })
      } else {
        res.json({ msg: "Erro ao Atualizar os Cargos dos Membros" })
      }
    } else {
      responseConsulta = await prisma.cargo.delete({
        where: {
          id: parseInt(id.id_cargo)
        },
        select: {
          id: true
        }

      })
    }
    res.json(responseConsulta)
  } catch (e) {
    if (e instanceof Prisma.PrismaClientValidationError) {
      res.json({ error: true, msg: "Erro de sintaxe ou campo Obrigatório Vazio!!" })
    }
    if (e instanceof Prisma.PrismaClientInitializationError) {
      res.json({ error: true, msg: "Erro de Conexão com o Banco de Dados!!" })
    } else {
      res.json({ error: true, msg: e })
    }
  }
})

//DELETAR O MEMBRO ESCOLHIDO 
app.delete('/deletar',checarToken, async (req, res) => {
  const ids = await req.body
  try {
    let response = await prisma.membros.delete({
      where: {
        id: parseInt(ids.id_membro)
      },
      select: {
        id: true
      }

    })
    response = await prisma.logradouro.delete({
      where: {
        id: parseInt(ids.id_logradouro)
      },
      select: {
        id: true
      }
    })
    res.json(response)
  }
  catch (e) {
    if (e instanceof Prisma.PrismaClientValidationError) {
      res.json({ error: true, msg: "Erro de sintaxe ou campo Obrigatório Vazio!!" })
    }
    if (e instanceof Prisma.PrismaClientInitializationError) {
      res.json({ error: true, msg: "Erro de Conexão com o Banco de Dados!!" })
    } else {
      res.json({ error: true, msg: e })
    }
  }
})

app.listen(process.env.PORT || 4041, "0.0.0.0", () => {
  console.log("Servidor on!!")
})
